"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import { AssessmentEditor } from "./platform-crm";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Download,
  FileLock2,
  MessageSquare,
  Search,
  Upload,
} from "lucide-react";
import { L } from "@/lib/content";
import { serviceDetailRows } from "@/lib/service-fields";
import { useSite } from "./site-shell";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  PreviewLinks,
  readableDate,
} from "./platform-shared";
import type { InquiryRecord, WorkspaceData } from "./platform-types";

type Detail = {
  inquiry: InquiryRecord;
  work: InquiryRecord["work"];
  messages: {
    id: string;
    author: string;
    body: string;
    visibility: string;
    created_at: string;
  }[];
  documents: {
    id: string;
    name: string;
    size: number;
    scan_state: string;
    visibility: string;
    created_at: string;
  }[];
};
export function InquiryWorkspace({
  data,
  staff,
  refresh,
  focus = "requests",
}: {
  data: WorkspaceData;
  staff: boolean;
  refresh: () => Promise<void>;
  focus?: "requests" | "messages" | "documents";
}) {
  const w = useWorkspaceCopy();
  const { t, catalog, language } = useSite(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [internal, setInternal] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [uploadNotice, setUploadNotice] = useState(""),
    [fileVisibility, setFileVisibility] = useState("internal"),
    [reference, setReference] = useState(""),
    [claimResult, setClaimResult] = useState<{
      message: string;
      previewLink?: string;
    } | null>(null);
  const records = data.inquiries.filter(
    (record) =>
      (status === "all" || record.status === status) &&
      `${record.reference} ${record.name} ${record.organization} ${record.service}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const load = async (id: string) => {
    setError("");
    try {
      setDetail(await platformApi<Detail>(`inquiries/${id}`));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load this inquiry.",
      );
    }
  };
  useEffect(() => {
    if (selected) void load(selected);
  }, [selected]);
  const active = data.inquiries.find((record) => record.id === selected);
  const exportCsv = () => {
    const safe = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r\n]/.test(text)) text = "'" + text;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = [
      [
        "Reference",
        "Date (UTC)",
        "Status",
        "Service",
        "Customer",
        "Organization",
        "Location",
        "Division details",
        "Additional services",
        "Next action",
      ],
      ...records.map((record) => [
        record.reference,
        record.createdAt,
        record.status,
        record.service,
        record.name,
        record.organization,
        record.location,
        serviceDetailRows(record)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; "),
        record.additionalServices?.join("; "),
        record.work.next_action,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(safe).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "TOC-authorized-inquiries.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="platform-record-workspace">
      <div className="platform-toolbar">
        <label className="platform-search">
          <Search size={18} />
          <span className="sr-only">
            <WorkspaceText text="Search inquiries" />
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t(
              L(
                "Search by reference, name or service",
                "Tafuta kwa rejea, jina au huduma",
              ),
            )}
          />
        </label>
        <label className="platform-filter">
          <span className="sr-only">
            <WorkspaceText text="Status" />
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {["all", "new", "in_review", "contacted", "closed"].map((value) => (
              <option key={value} value={value}>
                {w(value.replaceAll("_", " "))}
              </option>
            ))}
          </select>
        </label>
        {staff && (
          <button className="platform-small-button" onClick={exportCsv}>
            <Download size={16} />
            <WorkspaceText text=" Export authorized CSV " />
          </button>
        )}
      </div>
      {!staff && (
        <details className="platform-panel">
          <summary>
            {t(L("Link an existing inquiry", "Unganisha ombi lililopo"))}
          </summary>
          <ActionForm
            onSubmit={async () =>
              setClaimResult(
                await platformApi("inquiries/claim-link", {
                  reference,
                  email: data.user.email,
                }),
              )
            }
            label={t(
              L("Send a secure claim link", "Tuma kiungo salama cha ombi"),
            )}
          >
            <FormField label={t(L("Inquiry reference", "Rejea ya ombi"))}>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="TOC-2026-…"
                required
              />
            </FormField>
            <p>
              {t(
                L(
                  "We send a one-time link only to the email on the original request. Your verified account alone is not proof of ownership.",
                  "Tunatuma kiungo cha mara moja kwa barua pepe ya ombi la awali pekee. Akaunti iliyothibitishwa pekee haitoshi kuthibitisha umiliki.",
                ),
              )}
            </p>
          </ActionForm>
          {claimResult && <Notice>{claimResult.message}</Notice>}
          <PreviewLinks links={[claimResult?.previewLink]} />
        </details>
      )}
      {error && <Notice error>{error}</Notice>}
      <div className="inquiry-workspace-grid">
        <div className="platform-record-list">
          {records.length ? (
            records.map((record) => (
              <button
                key={record.id}
                className={selected === record.id ? "selected" : ""}
                onClick={() => setSelected(record.id)}
              >
                <span className="record-topline">
                  <strong>{record.reference}</strong>
                  <Badge value={record.status} />
                </span>
                <span>
                  {catalog.find((service) => service.slug === record.service)
                    ?.title[language] || w("General enquiry")}
                </span>
                <small>
                  {staff ? `${record.name} · ` : ""}
                  {record.location || w("Location to discuss")}
                </small>
                <small>{readableDate(record.createdAt)}</small>
              </button>
            ))
          ) : (
            <EmptyState
              title={t(
                L("No matching requests.", "Hakuna maombi yanayolingana."),
              )}
            >
              {t(
                L(
                  "Submit a request without registering, then claim it securely from the email acknowledgement.",
                  "Tuma ombi bila kujisajili, kisha liunganishe kwa usalama kupitia barua pepe.",
                ),
              )}
            </EmptyState>
          )}
        </div>
        <div className="platform-record-detail">
          {detail && active ? (
            <>
              <div className="platform-detail-heading">
                <div>
                  <small>{detail.inquiry.reference}</small>
                  <h2>
                    {t(L("The details that matter.", "Maelezo yaliyo muhimu."))}
                  </h2>
                </div>
                <Badge value={detail.inquiry.status} />
              </div>
              <dl className="platform-description-list">
                {[
                  [
                    "Service",
                    catalog.find(
                      (service) => service.slug === detail.inquiry.service,
                    )?.title[language] || detail.inquiry.service,
                  ],
                  [
                    "Contact",
                    `${detail.inquiry.name} · ${detail.inquiry.email}`,
                  ],
                  [
                    "Organization",
                    detail.inquiry.organization || "Not specified",
                  ],
                  ["Telephone", detail.inquiry.phone || "Not specified"],
                  ["Location", detail.inquiry.location || "To be discussed"],
                  ["Region", detail.inquiry.region || "Not specified"],
                  [
                    "Alternative date",
                    detail.inquiry.alternativeDate || "Not specified",
                  ],
                  [
                    "Self-reported source",
                    detail.inquiry.leadSource || "Not supplied",
                  ],
                  [
                    "Selected rate references",
                    (detail.inquiry.pricingSelections || [])
                      .map(
                        (item) =>
                          `${item.bookId}:${item.ruleId} × ${item.quantity}`,
                      )
                      .join("; ") || "None — detailed assessment",
                  ],
                  [
                    "Preferred date",
                    detail.inquiry.eventDate || "To be confirmed",
                  ],
                  ["Guest count", detail.inquiry.guestCount || "Not specified"],
                  ["Budget", detail.inquiry.budget || "To be discussed"],
                  [
                    "Additional divisions",
                    detail.inquiry.additionalServices?.join(", ") || "None",
                  ],
                  ...serviceDetailRows(detail.inquiry, language),
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{w(String(label))}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {detail.inquiry.preferences?.length > 0 && (
                <div className="platform-note">
                  <strong>
                    <WorkspaceText text="Requested considerations" />
                  </strong>
                  <p>{detail.inquiry.preferences.join(" · ")}</p>
                </div>
              )}
              {detail.inquiry.message && (
                <div className="platform-note">
                  <strong>{t(L("Your requirements", "Mahitaji yako"))}</strong>
                  <p>{detail.inquiry.message}</p>
                </div>
              )}
              {staff && data.capabilities?.["inquiry.edit"] && (
                <>
                  <AssessmentEditor
                    record={{ ...detail.inquiry, work: detail.work }}
                    onSaved={async () => {
                      await refresh();
                      await load(active.id);
                    }}
                  />
                  <AssignmentEditor
                    key={`${active.id}:${detail.work.version}`}
                    record={{ ...detail.inquiry, work: detail.work }}
                    data={data}
                    onSaved={async () => {
                      await refresh();
                      await load(active.id);
                    }}
                  />
                </>
              )}
              {focus !== "documents" && (
                <section className="platform-subsection">
                  <h3>
                    <MessageSquare size={19} />
                    {t(L("Conversation", "Mazungumzo"))}
                  </h3>
                  <div className="message-thread">
                    {detail.messages.length ? (
                      detail.messages.map((item) => (
                        <article
                          key={item.id}
                          className={
                            item.visibility === "internal" ? "internal" : ""
                          }
                        >
                          <small>
                            {item.author || w("TOC team")}{" "}
                            <WorkspaceText text="·" />{" "}
                            {readableDate(item.created_at)}{" "}
                            {item.visibility === "internal"
                              ? w("· INTERNAL NOTE")
                              : ""}
                          </small>
                          <p>{item.body}</p>
                        </article>
                      ))
                    ) : (
                      <p>
                        {t(
                          L(
                            "No messages yet. Do not share credentials, bank details or medical records.",
                            "Hakuna ujumbe bado. Usishiriki nywila, taarifa za benki au rekodi za afya.",
                          ),
                        )}
                      </p>
                    )}
                  </div>
                  {(!staff || data.capabilities?.["inquiry.edit"]) && (
                    <ActionForm
                      label={t(L("Send message", "Tuma ujumbe"))}
                      onSubmit={async () => {
                        await platformApi("messages", {
                          inquiryId: active.id,
                          body: message,
                          visibility:
                            staff && internal ? "internal" : "customer",
                        });
                        setMessage("");
                        await load(active.id);
                      }}
                    >
                      <FormField label={t(L("Your message", "Ujumbe wako"))}>
                        <textarea
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          minLength={2}
                          maxLength={5000}
                          rows={3}
                          required
                        />
                      </FormField>
                      {staff && (
                        <label className="platform-check">
                          <input
                            type="checkbox"
                            checked={internal}
                            onChange={(event) =>
                              setInternal(event.target.checked)
                            }
                          />
                          <WorkspaceText text=" Internal staff note — never shown to customers " />
                        </label>
                      )}
                    </ActionForm>
                  )}
                </section>
              )}
              {focus !== "messages" && (
                <section className="platform-subsection">
                  <h3>
                    <FileLock2 size={19} />
                    {t(L("Protected documents", "Nyaraka zilizolindwa"))}
                  </h3>
                  <p>
                    {t(
                      L(
                        "PDF, JPEG, PNG, WebP or plain text, up to 5 MB. Files are private and quarantined until malware scanning succeeds. Never send passwords, API keys or confidential production credentials.",
                        "PDF, JPEG, PNG, WebP au maandishi, hadi MB 5. Faili ni binafsi na huzuiliwa hadi zipite uchunguzi wa programu hasidi. Usitume nywila au siri za mifumo.",
                      ),
                    )}
                  </p>
                  <ul className="document-list">
                    {detail.documents.map((document) => (
                      <li key={document.id}>
                        <span>
                          <strong>{document.name}</strong>
                          <small>
                            {(document.size / 1024).toFixed(1)}{" "}
                            <WorkspaceText text="KB ·" /> {document.scan_state}{" "}
                            {staff ? ` · ${document.visibility}` : ""}
                          </small>
                        </span>
                        {document.scan_state === "clean" ? (
                          <a
                            href={`/api/platform/documents/${document.id}`}
                            className="platform-small-button"
                          >
                            <Download size={16} />
                            <WorkspaceText text=" Download " />
                          </a>
                        ) : (
                          <Badge value={document.scan_state} />
                        )}
                      </li>
                    ))}
                  </ul>
                  {(!staff || data.capabilities?.["inquiry.edit"]) && (
                    <ActionForm
                      label={t(
                        L(
                          "Upload to private quarantine",
                          "Pakia kwenye hifadhi binafsi ya ukaguzi",
                        ),
                      )}
                      disabled={!file}
                      onSubmit={async () => {
                        if (!file) return;
                        const response = await fetch(
                          `/api/platform/documents/upload?inquiryId=${active.id}&name=${encodeURIComponent(file.name)}&visibility=${staff ? fileVisibility : "customer"}`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/octet-stream",
                            },
                            body: file,
                          },
                        );
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error);
                        setUploadNotice(result.message);
                        setFile(null);
                        await load(active.id);
                      }}
                    >
                      {staff && (
                        <FormField
                          label={t(
                            L("Document visibility", "Mwonekano wa nyaraka"),
                          )}
                        >
                          <select
                            value={fileVisibility}
                            onChange={(event) =>
                              setFileVisibility(event.target.value)
                            }
                          >
                            <option value="internal">
                              <WorkspaceText text="Internal staff only — not customer-visible" />
                            </option>
                            <option value="customer">
                              <WorkspaceText text="Shared with this inquiry's customer" />
                            </option>
                          </select>
                        </FormField>
                      )}
                      <FormField
                        label={t(
                          L(
                            "Choose supporting file",
                            "Chagua faili ya kuunga mkono",
                          ),
                        )}
                      >
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                          onChange={(event) =>
                            setFile(event.target.files?.[0] || null)
                          }
                        />
                      </FormField>
                    </ActionForm>
                  )}
                  {uploadNotice && <Notice>{uploadNotice}</Notice>}
                </section>
              )}
              {!staff &&
                data.bookings.some(
                  (booking) =>
                    booking.inquiry_id === active.id &&
                    booking.status === "completed",
                ) && <Feedback inquiryId={active.id} />}
            </>
          ) : (
            <EmptyState
              title={t(
                L("Choose a request to see more.", "Chagua ombi kuona zaidi."),
              )}
            >
              {t(
                L(
                  "Your scope, messages and authorized documents stay together.",
                  "Mahitaji, ujumbe na nyaraka zako zilizoidhinishwa hukaa pamoja.",
                ),
              )}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
function AssignmentEditor({
  record,
  data,
  onSaved,
}: {
  record: InquiryRecord;
  data: WorkspaceData;
  onSaved: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [assignee, setAssignee] = useState(record.work.assigned_to || ""),
    [priority, setPriority] = useState(record.work.priority),
    [action, setAction] = useState(record.work.next_action),
    [due, setDue] = useState(record.work.due_at?.slice(0, 16) || ""),
    [status, setStatus] = useState(record.status),
    [primary, setPrimary] = useState(record.work.department),
    [additional, setAdditional] = useState<string[]>(
      record.additionalServices || [],
    ),
    [classificationReason, setClassificationReason] = useState("");
  return (
    <details className="platform-panel">
      <summary>
        <WorkspaceText text="Assignment & follow-up" />
      </summary>
      <ActionForm
        label="Save assignment"
        onSubmit={async () => {
          await platformApi("admin/inquiries", {
            id: record.id,
            expectedVersion: record.work.version,
            assignedTo: assignee || null,
            priority,
            nextAction: action,
            dueAt: due ? new Date(due).toISOString() : null,
            status,
          });
          await onSaved();
        }}
      >
        <div className="platform-two-col">
          <FormField label="Assigned officer">
            <select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">
                <WorkspaceText text="Unassigned" />
              </option>
              {data.directory
                ?.filter(
                  (user) =>
                    user.departments.includes(record.service) ||
                    (record.additionalServices || []).some((department) =>
                      user.departments.includes(department),
                    ),
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Priority">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {["planning", "normal", "high", "critical"].map((value) => (
                <option key={value} value={value}>
                  {w(value)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Inquiry status">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              {["new", "in_review", "contacted", "closed"].map((value) => (
                <option key={value} value={value}>
                  {w(value.replaceAll("_", " "))}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Follow-up deadline (your local time)">
            <input
              type="datetime-local"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Internal next action">
          <textarea
            value={action}
            onChange={(event) => setAction(event.target.value)}
            minLength={3}
            maxLength={1000}
            required
          />
        </FormField>
      </ActionForm>
      <details className="platform-panel">
        <summary>
          <WorkspaceText text="Reviewed classification correction" />
        </summary>
        <Notice>
          <WorkspaceText text="The original customer submission is preserved. Correcting routing revokes the current assignment and requires authority for every destination division." />
        </Notice>
        <ActionForm
          label="Save reviewed classification"
          onSubmit={async () => {
            await platformApi("admin/inquiries/classification", {
              id: record.id,
              expectedVersion: record.work.version,
              primaryService: primary,
              additionalServices: additional.filter(
                (value) => value !== primary,
              ),
              reason: classificationReason,
            });
            await onSaved();
          }}
        >
          <FormField label="Corrected primary division">
            <select
              value={primary}
              onChange={(event) => setPrimary(event.target.value)}
            >
              {[
                "event-management",
                "catering",
                "general-cleaning",
                "ict-solutions",
                "entertainment",
              ]
                .filter((value) => data.user.departments.includes(value))
                .map((value) => (
                  <option key={value} value={value}>
                    {w(value)}
                  </option>
                ))}
            </select>
          </FormField>
          <fieldset className="platform-panel">
            <legend>
              <WorkspaceText text="Corrected additional divisions" />
            </legend>
            {data.user.departments
              .filter((value) => value !== primary)
              .map((value) => (
                <label key={value} className="platform-check">
                  <input
                    type="checkbox"
                    checked={additional.includes(value)}
                    onChange={(event) =>
                      setAdditional(
                        event.target.checked
                          ? [...additional, value]
                          : additional.filter((item) => item !== value),
                      )
                    }
                  />
                  {value}
                </label>
              ))}
          </fieldset>
          <FormField label="Correction reason / review evidence">
            <textarea
              value={classificationReason}
              onChange={(event) => setClassificationReason(event.target.value)}
              minLength={10}
              maxLength={2000}
              required
            />
          </FormField>
        </ActionForm>
      </details>
    </details>
  );
}
function Feedback({ inquiryId }: { inquiryId: string }) {
  const [rating, setRating] = useState(5),
    [body, setBody] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <section className="platform-subsection">
      <h3>
        <WorkspaceText text="Service feedback" />
      </h3>
      {saved ? (
        <Notice>
          <WorkspaceText text=" Thank you. Your feedback is private; it has not been published as a testimonial. " />
        </Notice>
      ) : (
        <ActionForm
          label="Send feedback"
          onSubmit={async () => {
            await platformApi("feedback", { inquiryId, rating, body });
            setSaved(true);
          }}
        >
          <FormField label="Rating">
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} <WorkspaceText text="/ 5" />
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Feedback">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={3}
              maxLength={3000}
              required
            />
          </FormField>
        </ActionForm>
      )}
    </section>
  );
}
