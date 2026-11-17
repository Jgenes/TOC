"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import { useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { useSite } from "./site-shell";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  money,
  Notice,
  platformApi,
  readableDate,
} from "./platform-shared";
import type { QuoteItem, QuoteRecord, WorkspaceData } from "./platform-types";

export function QuotationsWorkspace({
  data,
  staff,
  refresh,
}: {
  data: WorkspaceData;
  staff: boolean;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState(false),
    [revision, setRevision] = useState<QuoteRecord | undefined>(),
    [filter, setFilter] = useState("all");
  const active = data.quotations.find((quote) => quote.id === selected),
    quotes = data.quotations.filter(
      (quote) => filter === "all" || quote.status === filter,
    ),
    canEdit = !!data.capabilities?.["quotation.edit"];
  return (
    <>
      <div className="platform-toolbar">
        <label className="platform-filter">
          <WorkspaceText text=" Quotation status " />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {[
              "all",
              "draft",
              "pending_approval",
              "approved",
              "issued",
              "accepted",
              "rejected",
              "superseded",
            ].map((value) => (
              <option key={value} value={value}>
                {w(value.replaceAll("_", " "))}
              </option>
            ))}
          </select>
        </label>
        {staff && canEdit && (
          <button
            className="button button-primary"
            onClick={() => {
              setRevision(undefined);
              setEditing(true);
            }}
          >
            <Plus size={17} />
            <WorkspaceText text=" Prepare quotation " />
          </button>
        )}
      </div>
      {editing ? (
        <QuoteEditor
          key={revision?.id || "new"}
          data={data}
          revision={revision}
          onCancel={() => setEditing(false)}
          onSaved={async (id) => {
            await refresh();
            setSelected(id);
            setEditing(false);
          }}
        />
      ) : (
        <div className="inquiry-workspace-grid">
          <div className="platform-record-list">
            {quotes.length ? (
              quotes.map((quote) => (
                <button
                  key={quote.id}
                  className={selected === quote.id ? "selected" : ""}
                  onClick={() => setSelected(quote.id)}
                >
                  <span className="record-topline">
                    <strong>
                      {quote.reference} <WorkspaceText text="· v" />
                      {quote.version}
                    </strong>
                    <Badge value={quote.status} />
                  </span>
                  <span>{quote.snapshot.customer.name}</span>
                  <strong>{money(quote.snapshot.totalMinor)}</strong>
                  <small>
                    <WorkspaceText text="Valid through " />
                    {quote.snapshot.expiresOn}
                  </small>
                </button>
              ))
            ) : (
              <EmptyState title="No quotations to display.">
                <WorkspaceText text=" Formal offers appear only after the service requirements, rates and terms have been reviewed by authorized staff. " />
              </EmptyState>
            )}
          </div>
          <div className="platform-record-detail">
            {active ? (
              <>
                <div className="platform-detail-heading">
                  <div>
                    <small>
                      {active.reference} <WorkspaceText text=" · VERSION " />
                      {active.version}
                    </small>
                    <h2>
                      <WorkspaceText text="A clear, versioned offer." />
                    </h2>
                  </div>
                  <Badge value={active.status} />
                </div>
                <p>
                  <strong>{active.snapshot.customer.name}</strong>{" "}
                  <WorkspaceText text="·" />{" "}
                  {active.snapshot.customer.organization}
                </p>
                <p className="platform-note">{active.snapshot.scope}</p>
                <div className="platform-table-wrap">
                  <table className="platform-table">
                    <caption className="sr-only">
                      <WorkspaceText text="Quotation line items" />
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">
                          <WorkspaceText text="Description" />
                        </th>
                        <th scope="col">
                          <WorkspaceText text="Quantity" />
                        </th>
                        <th scope="col">
                          <WorkspaceText text="Unit rate" />
                        </th>
                        <th scope="col">
                          <WorkspaceText text="Tax" />
                        </th>
                        <th scope="col">
                          <WorkspaceText text="Total" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.snapshot.items.map((item, index) => (
                        <tr key={index}>
                          <th scope="row">
                            {item.description}
                            <small>{item.department}</small>
                          </th>
                          <td>
                            {item.quantity} {item.unit}
                          </td>
                          <td>{money(item.unitMinor || 0)}</td>
                          <td>
                            {item.taxBps / 100}
                            <WorkspaceText text="%" />{" "}
                            {item.taxInclusive ? w("incl.") : w("excl.")}
                          </td>
                          <td>{money(item.totalMinor || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="quotation-totals">
                  <div>
                    <dt>
                      <WorkspaceText text="Net subtotal" />
                    </dt>
                    <dd>{money(active.snapshot.subtotalMinor)}</dd>
                  </div>
                  <div>
                    <dt>
                      <WorkspaceText text="Tax" />
                    </dt>
                    <dd>{money(active.snapshot.taxMinor)}</dd>
                  </div>
                  <div>
                    <dt>
                      <WorkspaceText text=" Discount applied (" />
                      {active.snapshot.discountBps / 100}
                      <WorkspaceText text="%)" />
                    </dt>
                    <dd>{money(active.snapshot.discountMinor)}</dd>
                  </div>
                  <div className="grand-total">
                    <dt>
                      <WorkspaceText text="Total · TZS" />
                    </dt>
                    <dd>{money(active.snapshot.totalMinor)}</dd>
                  </div>
                </dl>
                <div className="platform-two-col">
                  <div>
                    <small>
                      <WorkspaceText text="VALID THROUGH" />
                    </small>
                    <p>{active.snapshot.expiresOn}</p>
                  </div>
                  <div>
                    <small>
                      <WorkspaceText text="ISSUED" />
                    </small>
                    <p>{readableDate(active.issued_at)}</p>
                  </div>
                </div>
                <h3>
                  <WorkspaceText text="Terms for this exact version" />
                </h3>
                <div className="quotation-terms">{active.snapshot.terms}</div>
                <Notice>
                  <WorkspaceText text=" Customer acceptance is not booking confirmation. Operations must separately verify dates, resources, staffing, contractual and payment conditions. " />
                </Notice>
                {!["draft", "pending_approval"].includes(active.status) && (
                  <a
                    className="platform-small-button"
                    href={`/api/platform/quotations/${active.id}/pdf`}
                  >
                    <Download size={17} />
                    <WorkspaceText text=" Download quotation PDF " />
                  </a>
                )}
                {staff ? (
                  <>
                    <div className="platform-subsection">
                      <h3>
                        <WorkspaceText text="Review & authority" />
                      </h3>
                      <dl className="platform-description-list">
                        <div>
                          <dt>
                            <WorkspaceText text="Technical reviews" />
                          </dt>
                          <dd>
                            {Object.keys(
                              JSON.parse(active.technical_by || "{}"),
                            ).join(", ") || w("Pending")}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <WorkspaceText text="Finance review" />
                          </dt>
                          <dd>
                            {active.finance_by ? w("Recorded") : w("Pending")}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <WorkspaceText text="Delegated final approval" />
                          </dt>
                          <dd>
                            {active.approved_by ? w("Recorded") : w("Pending")}
                          </dd>
                        </div>
                      </dl>
                      {canEdit && (
                        <QuoteAction
                          key={
                            active.id +
                            active.status +
                            active.technical_by +
                            active.finance_by
                          }
                          quote={active}
                          data={data}
                          onSaved={refresh}
                        />
                      )}
                    </div>
                    {canEdit && (
                      <button
                        className="platform-small-button"
                        onClick={() => {
                          setRevision(active);
                          setEditing(true);
                        }}
                      >
                        <WorkspaceText text=" Create a new version — preserve this snapshot " />
                      </button>
                    )}
                  </>
                ) : (
                  <CustomerQuoteActions
                    key={active.id + active.status}
                    quote={active}
                    refresh={refresh}
                  />
                )}
              </>
            ) : (
              <EmptyState title="Choose a quotation.">
                <WorkspaceText text=" Every issued version keeps its own prices, tax treatment, expiry and terms. A revised offer never silently overwrites the previous version. " />
              </EmptyState>
            )}
          </div>
        </div>
      )}
    </>
  );
}
function QuoteEditor({
  data,
  revision,
  onSaved,
  onCancel,
}: {
  data: WorkspaceData;
  revision?: QuoteRecord;
  onSaved: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const w = useWorkspaceCopy();
  const interfaceLanguage = useSite().language;
  const { catalog } = useSite(),
    [inquiryId, setInquiryId] = useState(revision?.inquiry_id || ""),
    [scope, setScope] = useState(revision?.snapshot.scope || ""),
    [suggestion, setSuggestion] = useState<{
      scope: string;
      notice: string;
      missingFields: string[];
    } | null>(null),
    [suggestionError, setSuggestionError] = useState(""),
    [suggesting, setSuggesting] = useState(false),
    [terms, setTerms] = useState(revision?.snapshot.terms || ""),
    [reason, setReason] = useState(""),
    [expiry, setExpiry] = useState(revision?.snapshot.expiresOn || ""),
    [discount, setDiscount] = useState(revision?.snapshot.discountBps || 0),
    [items, setItems] = useState<QuoteItem[]>(
      revision?.snapshot.items.map(
        ({
          description,
          quantity,
          unit,
          unitPrice,
          taxBps,
          taxInclusive,
          department,
          priceRuleId,
        }) => ({
          description,
          quantity,
          unit,
          unitPrice,
          taxBps,
          taxInclusive,
          department,
          ...(priceRuleId ? { priceRuleId } : {}),
        }),
      ) || [
        {
          description: "",
          quantity: "1",
          unit: "service",
          unitPrice: "",
          taxBps: 0,
          taxInclusive: false,
          department: data.user.departments[0] || "event-management",
        },
      ],
    );
  const setItem = (index: number, key: keyof QuoteItem, value: unknown) =>
    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
              ...([
                "unitPrice",
                "taxBps",
                "taxInclusive",
                "department",
                "unit",
                "description",
              ].includes(key)
                ? { priceRuleId: undefined }
                : {}),
            }
          : item,
      ),
    );
  return (
    <section className="platform-panel">
      <div className="platform-detail-heading">
        <div>
          <small>
            {revision
              ? `${revision.reference} — new revision`
              : w("COMMERCIAL DRAFT")}
          </small>
          <h2>
            <WorkspaceText text="Prepare, then review." />
          </h2>
        </div>
        <button className="platform-small-button" onClick={onCancel}>
          <WorkspaceText text=" Cancel editor " />
        </button>
      </div>
      <Notice>
        <WorkspaceText text=" Rates entered here are not an approved price book or public offer. Explain any manual pricing, discount and tax treatment. A different technical reviewer, finance review and delegated approval are required before issuance. " />
      </Notice>
      <ActionForm
        label="Save new draft version"
        onSubmit={async () => {
          const result = await platformApi<{ id: string }>("admin/quotations", {
            inquiryId,
            quotationId: revision?.quotation_id,
            items,
            discountBps: discount,
            expiresOn: expiry,
            terms,
            scope,
            pricingReason: reason,
            currency: "TZS",
          });
          await onSaved(result.id);
        }}
      >
        <FormField label="Source inquiry">
          <select
            value={inquiryId}
            onChange={(event) => setInquiryId(event.target.value)}
            disabled={!!revision}
            required
          >
            <option value="">
              <WorkspaceText text="Choose an authorized inquiry" />
            </option>
            {data.inquiries.map((inquiry) => (
              <option key={inquiry.id} value={inquiry.id}>
                {inquiry.reference} <WorkspaceText text="—" /> {inquiry.name}{" "}
                <WorkspaceText text="—" /> {inquiry.service}
              </option>
            ))}
          </select>
        </FormField>
        <div className="platform-panel">
          <button
            type="button"
            className="platform-small-button"
            disabled={!inquiryId || suggesting}
            onClick={async () => {
              setSuggesting(true);
              setSuggestionError("");
              try {
                setSuggestion(
                  await platformApi("assistant", {
                    module: "quotation-draft",
                    inquiryId,
                    text: "Prepare a technical assessment draft from this authorized inquiry.",
                    language: "en",
                  }),
                );
              } catch (error) {
                setSuggestionError(
                  error instanceof Error
                    ? error.message
                    : "The draft assistant is unavailable.",
                );
              } finally {
                setSuggesting(false);
              }
            }}
          >
            {suggesting
              ? w("Preparing draft…")
              : w("Suggest scope from source inquiry")}
          </button>
          {suggestionError && <Notice error>{suggestionError}</Notice>}
          {suggestion && (
            <>
              <pre className="quotation-terms">{suggestion.scope}</pre>
              <Notice>{suggestion.notice}</Notice>
              <button
                type="button"
                className="platform-small-button"
                onClick={() => {
                  setScope(suggestion.scope);
                  setSuggestion(null);
                }}
              >
                <WorkspaceText text="Use this draft scope for staff review" />
              </button>
            </>
          )}
        </div>
        <FormField label="Agreed technical scope">
          <textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            minLength={10}
            maxLength={8000}
            rows={4}
            required
          />
        </FormField>
        {items.map((item, index) => (
          <fieldset className="quote-line-editor" key={index}>
            <legend>
              <WorkspaceText text="Line " />
              {index + 1}
            </legend>
            <div className="platform-toolbar">
              <FormField label="Use an approved price-book rule">
                <select
                  value={item.priceRuleId || ""}
                  onChange={(event) => {
                    const [bookId, ruleId] = event.target.value.split(":");
                    const book = data.priceBooks?.find(
                        (book) => book.id === bookId,
                      ),
                      rule = book?.rules.find((rule) => rule.id === ruleId);
                    if (!book || !rule) {
                      setItem(index, "priceRuleId", undefined);
                      return;
                    }
                    if (book && rule)
                      setItems((previous) =>
                        previous.map((entry, i) =>
                          i === index
                            ? {
                                ...entry,
                                description: rule.description,
                                unit: rule.unit,
                                unitPrice: rule.unitPrice,
                                taxBps: rule.taxBps,
                                taxInclusive: rule.taxInclusive,
                                department: book.department,
                                priceRuleId: `${bookId}:${ruleId}`,
                              }
                            : entry,
                        ),
                      );
                  }}
                >
                  <option value="">
                    <WorkspaceText text="Manual proposal — explain below" />
                  </option>
                  {data.priceBooks
                    ?.filter(
                      (book) =>
                        book.state === "approved" &&
                        book.effective_from <= new Date().toISOString() &&
                        book.effective_to > new Date().toISOString(),
                    )
                    .flatMap((book) =>
                      book.rules.map((rule) => (
                        <option
                          key={`${book.id}:${rule.id}`}
                          value={`${book.id}:${rule.id}`}
                        >
                          {book.name} <WorkspaceText text="·" />{" "}
                          {rule.description}
                        </option>
                      )),
                    )}
                </select>
              </FormField>
              <button
                className="platform-small-button"
                type="button"
                disabled={items.length === 1}
                aria-label={`${w("Remove quotation line")} ${index + 1}`}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <FormField label="Description">
              <input
                value={item.description}
                onChange={(event) =>
                  setItem(index, "description", event.target.value)
                }
                minLength={3}
                maxLength={500}
                required
              />
            </FormField>
            <div className="platform-three-col">
              <FormField label="Quantity">
                <input
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) =>
                    setItem(index, "quantity", event.target.value)
                  }
                  required
                />
              </FormField>
              <FormField label="Unit">
                <input
                  value={item.unit}
                  onChange={(event) =>
                    setItem(index, "unit", event.target.value)
                  }
                  maxLength={40}
                  required
                />
              </FormField>
              <FormField label="Unit price · TZS">
                <input
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  value={item.unitPrice}
                  onChange={(event) => {
                    setItem(index, "unitPrice", event.target.value);
                    setItem(index, "priceRuleId", undefined);
                  }}
                  required
                />
              </FormField>
              <FormField label="Tax rate · %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={item.taxBps / 100}
                  onChange={(event) =>
                    setItem(
                      index,
                      "taxBps",
                      Math.round(Number(event.target.value) * 100),
                    )
                  }
                  required
                />
              </FormField>
              <FormField label="Department">
                <select
                  value={item.department}
                  onChange={(event) =>
                    setItem(index, "department", event.target.value)
                  }
                >
                  {catalog
                    .filter((service) =>
                      data.user.departments.includes(service.slug),
                    )
                    .map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {service.title[interfaceLanguage]}
                      </option>
                    ))}
                </select>
              </FormField>
              <label className="platform-check">
                <input
                  type="checkbox"
                  checked={item.taxInclusive}
                  onChange={(event) =>
                    setItem(index, "taxInclusive", event.target.checked)
                  }
                />
                <WorkspaceText text=" Tax included in rate " />
              </label>
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="platform-small-button"
          onClick={() =>
            setItems([
              ...items,
              {
                description: "",
                quantity: "1",
                unit: "service",
                unitPrice: "",
                taxBps: 0,
                taxInclusive: false,
                department: data.user.departments[0] || "event-management",
              },
            ])
          }
        >
          <Plus size={16} />
          <WorkspaceText text=" Add line item " />
        </button>
        <div className="platform-two-col">
          <FormField label="Discount · %">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={discount / 100}
              onChange={(event) =>
                setDiscount(Math.round(Number(event.target.value) * 100))
              }
            />
          </FormField>
          <FormField label="Expiry date">
            <input
              type="date"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              required
            />
          </FormField>
        </div>
        <FormField label="Pricing, discount & tax justification">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={2000}
            required
          />
        </FormField>
        <FormField label="Customer-facing terms, payment conditions & validity">
          <textarea
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            minLength={10}
            maxLength={8000}
            rows={5}
            required
          />
        </FormField>
      </ActionForm>
    </section>
  );
}
function QuoteAction({
  quote,
  data,
  onSaved,
}: {
  quote: QuoteRecord;
  data: WorkspaceData;
  onSaved: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [action, setAction] = useState(
      quote.status === "draft"
        ? "submit"
        : quote.status === "approved"
          ? "issue"
          : "technical",
    ),
    [department, setDepartment] = useState(
      quote.snapshot.departments.find((department) =>
        data.user.departments.includes(department),
      ) || "",
    ),
    [reason, setReason] = useState("");
  const actions =
    quote.status === "draft"
      ? ["submit"]
      : quote.status === "approved"
        ? ["issue"]
        : quote.status === "pending_approval"
          ? [
              ...(data.capabilities?.["quotation.technical"]
                ? ["technical"]
                : []),
              ...(data.capabilities?.["quotation.finance"] ? ["finance"] : []),
              ...(data.capabilities?.["quotation.approve"]
                ? ["approve", "reject"]
                : []),
            ]
          : [];
  if (!actions.length) return null;
  const current = actions.includes(action) ? action : actions[0];
  return (
    <ActionForm
      label="Record authorized action"
      onSubmit={async () => {
        await platformApi("admin/quotations/action", {
          id: quote.id,
          action: current,
          department: current === "technical" ? department : undefined,
          reason,
        });
        await onSaved();
      }}
    >
      <div className="platform-two-col">
        <FormField label="Action">
          <select
            value={current}
            onChange={(event) => setAction(event.target.value)}
          >
            {actions.map((value) => (
              <option key={value} value={value}>
                {
                  {
                    submit: "Submit for approval",
                    technical: "Record technical review",
                    finance: "Record finance review",
                    approve: "Grant delegated final approval",
                    issue: "Issue this approved version",
                    reject: "Reject draft",
                  }[value]
                }
              </option>
            ))}
          </select>
        </FormField>
        {current === "technical" && (
          <FormField label="Department reviewed">
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              {quote.snapshot.departments
                .filter((department) =>
                  data.user.departments.includes(department),
                )
                .map((department) => (
                  <option key={department} value={department}>
                    {w(department)}
                  </option>
                ))}
            </select>
          </FormField>
        )}
      </div>
      <FormField label="Decision evidence / reason">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={10}
          maxLength={2000}
          required
        />
      </FormField>
    </ActionForm>
  );
}
function CustomerQuoteActions({
  quote,
  refresh,
}: {
  quote: QuoteRecord;
  refresh: () => Promise<void>;
}) {
  const [declineReason, setDeclineReason] = useState(""),
    [confirm, setConfirm] = useState(false),
    [accepted, setAccepted] = useState(false),
    [revisionMessage, setRevisionMessage] = useState(""),
    [sent, setSent] = useState(false);
  return (
    <div className="platform-subsection">
      {accepted && (
        <Notice>
          <WorkspaceText text=" Acceptance recorded for this version. It did not confirm a booking. TOC operations will review the delivery conditions. " />
        </Notice>
      )}
      {quote.status === "issued" && quote.current_version === quote.version && (
        <ActionForm
          label={`Accept ${quote.reference} · version ${quote.version}`}
          disabled={!confirm}
          onSubmit={async () => {
            await platformApi("quotations/accept", {
              id: quote.id,
              version: quote.version,
              confirm,
              terms: quote.snapshot.terms,
            });
            setAccepted(true);
            await refresh();
          }}
        >
          <label className="platform-check">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(event) => setConfirm(event.target.checked)}
              required
            />
            <WorkspaceText text=" I have reviewed the scope, total, expiry and exact terms of version" />{" "}
            {quote.version}
            <WorkspaceText text=". I understand that TOC must separately confirm the booking. " />
          </label>
        </ActionForm>
      )}
      {quote.status === "issued" && (
        <details className="platform-panel">
          <summary>
            <WorkspaceText text="Decline this quotation" />
          </summary>
          <ActionForm
            label="Record decline for this exact version"
            onSubmit={async () => {
              await platformApi("quotations/decline", {
                id: quote.id,
                reason: declineReason,
              });
              await refresh();
            }}
          >
            <FormField label="Reason / requested follow-up">
              <textarea
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                minLength={10}
                maxLength={2000}
                required
              />
            </FormField>
          </ActionForm>
        </details>
      )}
      {!["superseded", "rejected"].includes(quote.status) && (
        <details className="platform-panel">
          <summary>
            <WorkspaceText text="Ask a question or request a revision" />
          </summary>
          {sent && (
            <Notice>
              <WorkspaceText text=" Revision request sent. The issued offer remains unchanged unless TOC issues a new approved version. " />
            </Notice>
          )}
          <ActionForm
            label="Send revision request"
            onSubmit={async () => {
              await platformApi("messages", {
                inquiryId: quote.inquiry_id,
                body: `Revision / clarification request for ${quote.reference} v${quote.version}:\n${revisionMessage}`,
                visibility: "customer",
              });
              setSent(true);
              setRevisionMessage("");
            }}
          >
            <FormField label="What would you like to change or clarify?">
              <textarea
                value={revisionMessage}
                onChange={(event) => setRevisionMessage(event.target.value)}
                minLength={5}
                maxLength={3000}
                rows={3}
                required
              />
            </FormField>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
