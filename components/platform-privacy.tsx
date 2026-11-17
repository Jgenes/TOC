"use client";
import { useWorkspaceCopy, WorkspaceText } from "./workspace-text";
import { useState } from "react";
import { L } from "@/lib/content";
import { useSite } from "./site-shell";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  readableDate,
} from "./platform-shared";
import type { PrivacyRequest, WorkspaceData } from "./platform-types";

export function PrivacyPanel({
  data,
  refresh,
  management = false,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
  management?: boolean;
}) {
  const { t } = useSite(),
    [category, setCategory] = useState("access"),
    [details, setDetails] = useState(""),
    [saved, setSaved] = useState("");
  const rows = management ? data.privacyQueue : data.privacyRequests;
  return (
    <section className="platform-panel">
      <h2>{t(L("Data rights & retention", "Haki za data na uhifadhi"))}</h2>
      <Notice>
        {t(
          L(
            "Access, correction, deletion and retention requests are reviewed by a responsible person. A request never silently deletes commercial evidence or overrides a lawful retention obligation. Do not upload identification documents here; the team will agree a secure verification method if needed.",
            "Maombi ya ufikiaji, usahihishaji, ufutaji na uhifadhi hupitiwa na mhusika. Ombi halifuti kimyakimya ushahidi wa biashara au kubadili wajibu halali wa uhifadhi. Usipakie nyaraka za utambulisho hapa; timu itakubaliana njia salama ya uthibitisho ikihitajika.",
          ),
        )}
      </Notice>
      {!management && (
        <>
          <a
            className="platform-small-button"
            href="/api/platform/auth/data-export"
          >
            {t(
              L(
                "Download my account data · JSON",
                "Pakua data za akaunti yangu · JSON",
              ),
            )}
          </a>
          <ActionForm
            label={t(
              L("Record a data-rights request", "Rekodi ombi la haki za data"),
            )}
            onSubmit={async () => {
              const result = await platformApi<{ reference: string }>(
                "privacy-requests",
                { category, details },
              );
              setSaved(result.reference);
              setDetails("");
              await refresh();
            }}
          >
            <FormField label={t(L("Request category", "Aina ya ombi"))}>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {[
                  ["access", "Access / copy", "Ufikiaji / nakala"],
                  ["correction", "Correction", "Usahihishaji"],
                  ["deletion", "Deletion assessment", "Tathmini ya ufutaji"],
                  ["retention", "Retention question", "Swali la uhifadhi"],
                ].map(([value, en, sw]) => (
                  <option key={value} value={value}>
                    {t(L(en, sw))}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={t(
                L(
                  "Describe the records and action requested",
                  "Eleza rekodi na hatua unayoomba",
                ),
              )}
            >
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                minLength={10}
                maxLength={2000}
                required
              />
            </FormField>
          </ActionForm>
          {saved && (
            <Notice>
              {t(L("Request recorded", "Ombi limerekodiwa"))}
              <WorkspaceText text=":" /> {saved}
            </Notice>
          )}
        </>
      )}
      <div className="platform-card-stack">
        {rows?.length ? (
          rows.map((row) => (
            <PrivacyCard
              key={`${row.id}:${row.version}`}
              row={row}
              management={management}
              refresh={refresh}
            />
          ))
        ) : (
          <EmptyState
            title={t(
              L(
                "No data-rights requests recorded.",
                "Hakuna maombi ya haki za data yaliyorekodiwa.",
              ),
            )}
          />
        )}
      </div>
    </section>
  );
}
function PrivacyCard({
  row,
  management,
  refresh,
}: {
  row: PrivacyRequest;
  management: boolean;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const { t } = useSite(),
    [state, setState] = useState(
      row.state === "received" ? "in_review" : "completed",
    ),
    [resolution, setResolution] = useState(""),
    [verified, setVerified] = useState(false);
  return (
    <details className="platform-panel">
      <summary>
        <strong>
          {row.reference} <WorkspaceText text="·" /> {row.category}
        </strong>{" "}
        <Badge value={row.state} />
      </summary>
      <p>
        {readableDate(row.created_at)} <WorkspaceText text="EAT" />
      </p>
      {management && (
        <p>
          {row.name} <WorkspaceText text="·" /> {row.email}
        </p>
      )}
      <p>{row.details}</p>
      {row.resolution && <div className="platform-note">{row.resolution}</div>}
      {management && ["received", "in_review"].includes(row.state) && (
        <ActionForm
          label={t(L("Record reviewed outcome", "Rekodi matokeo ya mapitio"))}
          disabled={!verified}
          onSubmit={async () => {
            await platformApi("admin/privacy/action", {
              id: row.id,
              expectedVersion: row.version,
              state,
              resolution,
              identityVerified: verified,
            });
            await refresh();
          }}
        >
          <FormField label={t(L("Next state", "Hali inayofuata"))}>
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              {(row.state === "received"
                ? ["in_review"]
                : ["completed", "declined"]
              ).map((value) => (
                <option key={value} value={value}>
                  {w(value)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t(
              L(
                "Customer-visible response and retention grounds",
                "Jibu la mteja na sababu za uhifadhi",
              ),
            )}
          >
            <textarea
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              minLength={20}
              maxLength={3000}
              required
            />
          </FormField>
          <label className="platform-check">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
            />
            {t(
              L(
                "I verified identity and scope, assessed applicable retention obligations and accurately recorded any separately performed data action.",
                "Nimethibitisha utambulisho na wigo, nimepitia wajibu wa uhifadhi na kurekodi kwa usahihi hatua zozote za data zilizofanywa kando.",
              ),
            )}
          </label>
        </ActionForm>
      )}
    </details>
  );
}
