"use client";
import { useEffect, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { L } from "@/lib/content";
import { useSite } from "./site-shell";

type PricingOption = {
  id: string;
  bookId: string;
  description: string;
  unit: string;
  unitPrice: string;
  taxBps: number;
  taxInclusive: boolean;
  department: string;
  effectiveTo: string;
};
export type PricingSelection = {
  bookId: string;
  ruleId: string;
  quantity: string;
};
type Estimate = {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  notice: string;
};
export function EstimatePlanner({
  service,
  selections,
  onChange,
}: {
  service: string;
  selections: PricingSelection[];
  onChange: (next: PricingSelection[]) => void;
}) {
  const { t, language } = useSite(),
    [options, setOptions] = useState<PricingOption[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [estimate, setEstimate] = useState<Estimate | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/platform/pricing", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((result) => {
        if (active) {
          setOptions(result.options || []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setLoaded(true);
          setError(
            t(
              L(
                "Price options are temporarily unavailable. You can still request a detailed assessment.",
                "Chaguzi za bei hazipatikani kwa sasa. Bado unaweza kuomba tathmini ya kina.",
              ),
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setEstimate(null);
  }, [service, selections]);
  const available = options.filter((option) => option.department === service),
    money = (value: number) =>
      new Intl.NumberFormat(language === "sw" ? "sw-TZ" : "en-TZ", {
        style: "currency",
        currency: "TZS",
      }).format(value / 100);
  return (
    <details className="estimate-planner">
      <summary>
        <Calculator size={18} />
        {t(L("Optional preliminary estimate", "Makadirio ya awali ya hiari"))}
      </summary>
      <p>
        {t(
          L(
            "This planning calculator uses current finance-approved public rates only. It is not a formal quotation, a guarantee of availability or a booking. Selected rule references and quantities are included in your request; final logistics, taxes and scope still need human review.",
            "Kikokotoo hiki hutumia viwango vya umma vilivyoidhinishwa na fedha pekee. Si bei rasmi, hakikisho la upatikanaji au nafasi iliyothibitishwa. Marejeo ya viwango na idadi uliyochagua hujumuishwa katika ombi; usafiri, kodi na mahitaji bado yanahitaji mapitio ya timu.",
          ),
        )}
      </p>
      {!loaded ? (
        <p role="status">
          {t(
            L(
              "Checking approved options…",
              "Tunatafuta chaguzi zilizoidhinishwa…",
            ),
          )}
        </p>
      ) : !available.length ? (
        <p className="scope-note">
          {t(
            L(
              "No approved public price options are configured for this division. Request a detailed assessment instead; no example price has been substituted.",
              "Hakuna chaguzi za bei za umma zilizoidhinishwa kwa idara hii. Omba tathmini ya kina; hakuna bei ya mfano iliyowekwa.",
            ),
          )}
        </p>
      ) : (
        <>
          <div className="estimate-items">
            {selections.map((selection, index) => (
              <div key={index} className="estimate-row">
                <label>
                  {t(L("Approved option", "Chaguo lililoidhinishwa"))}
                  <select
                    value={`${selection.bookId}:${selection.ruleId}`}
                    onChange={(event) => {
                      const [bookId, ruleId] = event.target.value.split(":");
                      onChange(
                        selections.map((item, i) =>
                          i === index ? { ...item, bookId, ruleId } : item,
                        ),
                      );
                    }}
                  >
                    <option value=":">
                      {t(L("Choose an option", "Chagua chaguo"))}
                    </option>
                    {available.map((option) => (
                      <option
                        key={`${option.bookId}:${option.id}`}
                        value={`${option.bookId}:${option.id}`}
                      >
                        {option.description} · TZS {option.unitPrice} /{" "}
                        {option.unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(L("Quantity", "Idadi"))}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    max="1000000"
                    step="0.001"
                    value={selection.quantity}
                    onChange={(event) =>
                      onChange(
                        selections.map((item, i) =>
                          i === index
                            ? { ...item, quantity: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={t(
                    L(
                      `Remove estimate item ${index + 1}`,
                      `Ondoa kipengele cha makadirio ${index + 1}`,
                    ),
                  )}
                  onClick={() =>
                    onChange(selections.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="estimate-actions">
            <button
              type="button"
              className="platform-small-button"
              disabled={selections.length >= 20}
              onClick={() =>
                onChange([
                  ...selections,
                  {
                    bookId: available[0].bookId,
                    ruleId: available[0].id,
                    quantity: "1",
                  },
                ])
              }
            >
              <Plus size={16} />
              {t(L("Add approved option", "Ongeza chaguo lililoidhinishwa"))}
            </button>
            <button
              type="button"
              className="platform-small-button"
              disabled={busy || !selections.length}
              onClick={async () => {
                setBusy(true);
                setError("");
                setEstimate(null);
                try {
                  const response = await fetch("/api/platform/estimates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ items: selections }),
                    }),
                    result = await response.json();
                  if (!response.ok)
                    throw new Error(
                      result.error ||
                        "The options changed. Please review your selection.",
                    );
                  setEstimate(result);
                } catch {
                  setError(
                    t(
                      L(
                        "These options could not be priced. Check the quantity and current rate availability, or remove the estimate options and request an assessment.",
                        "Chaguzi hizi hazikuweza kukokotolewa. Hakiki idadi na upatikanaji wa viwango, au ondoa chaguzi na uombe tathmini.",
                      ),
                    ),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(
                busy
                  ? L("Calculating…", "Tunakokotoa…")
                  : L(
                      "Calculate nonbinding estimate",
                      "Kokotoa makadirio yasiyo bei rasmi",
                    ),
              )}
            </button>
          </div>
          {estimate && (
            <div className="estimate-result" role="status">
              <strong>
                {t(
                  L(
                    "PRELIMINARY — NOT A FORMAL OFFER",
                    "MAKADIRIO — SI BEI RASMI",
                  ),
                )}
              </strong>
              <dl>
                <div>
                  <dt>{t(L("Subtotal", "Jumla kabla ya kodi"))}</dt>
                  <dd>{money(estimate.subtotalMinor)}</dd>
                </div>
                <div>
                  <dt>
                    {t(
                      L(
                        "Tax from approved rules",
                        "Kodi ya viwango vilivyoidhinishwa",
                      ),
                    )}
                  </dt>
                  <dd>{money(estimate.taxMinor)}</dd>
                </div>
                <div>
                  <dt>{t(L("Indicative total", "Makadirio ya jumla"))}</dt>
                  <dd>{money(estimate.totalMinor)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
