"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import { useEffect, useState, useRef } from "react";
import { Eye, History, Plus, Save, Upload } from "lucide-react";
import { useSite } from "./site-shell";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  readableDate,
  StructuredFields,
} from "./platform-shared";
import type { ContentItem, WorkspaceData } from "./platform-types";

const types = [
  "page",
  "service",
  "package",
  "menu",
  "project",
  "client",
  "testimonial",
  "article",
  "career",
  "team",
  "faq",
  "gallery",
  "document",
  "knowledge",
];
const text = (en = "", sw = "") => ({ en, sw });
function template(type: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title: text(),
    summary: text(),
    body: text(),
    category: "",
    image: "/assets/hero.webp",
    imageAlt: text(
      "Illustrative image — replace with authorized media",
      "Picha ya mfano — badilisha kwa picha iliyoidhinishwa",
    ),
    seo: {
      title: "",
      description: "",
      canonicalPath: "",
      socialTitle: "",
      socialDescription: "",
    },
    imagePosition: "center",
    mobileImagePosition: "center",
    caption: text(),
    videoUrl: "",
    mediaRights: false,
    permissionEvidence: "",
  };
  if (["project", "client", "testimonial", "team", "gallery"].includes(type))
    Object.assign(data, {
      clientApproved: false,
      mediaRights: false,
      permissionEvidence: "",
    });
  if (["project", "package", "menu", "faq", "gallery"].includes(type))
    data.service = "event-management";
  if (type === "project")
    Object.assign(data, { year: new Date().getFullYear(), location: "" });
  if (type === "article")
    Object.assign(data, {
      author: "",
      date: new Date().toISOString().slice(0, 10),
    });
  if (type === "testimonial") data.attribution = "";
  if (type === "page")
    data.sections = [{ kind: "text", title: text(), body: text(), items: [] }];
  if (type === "menu")
    Object.assign(data, {
      service: "catering",
      portionUnit: "per person",
      dietaryTags: [],
      allergenInformation: text(),
      availability: "assessment",
    });
  return data;
}
function editableData(
  data: Record<string, unknown> | undefined,
  type: string,
): Record<string, unknown> {
  if (!data) return template(type);
  if (["company", "navigation"].includes(type)) return data;
  return {
    seo: {
      title: "",
      description: "",
      canonicalPath: "",
      socialTitle: "",
      socialDescription: "",
    },
    caption: text(),
    mediaRights: false,
    permissionEvidence: "",
    ...(type === "homepage"
      ? {
          heroPosition: "center",
          heroMobilePosition: "center",
          heroAlt: text(),
        }
      : type === "service"
        ? {
            imagePosition: "center",
            mobileImagePosition: "center",
            imageAltLocalized: text(),
          }
        : {
            imagePosition: "center",
            mobileImagePosition: "center",
            videoUrl: "",
          }),
    ...data,
  };
}
export function ContentStudio({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [type, setType] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [newType, setNewType] = useState("article");
  const items = (data.content || []).filter(
      (item) => type === "all" || item.type === type,
    ),
    record = data.content?.find((item) => item.id === selected);
  return (
    <>
      <div className="platform-toolbar">
        <FormField label="Content collection">
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">
              <WorkspaceText text="All collections" />
            </option>
            {[...new Set(data.content?.map((item) => item.type))].map(
              (value) => (
                <option key={value} value={value}>
                  {w(value)}
                </option>
              ),
            )}
          </select>
        </FormField>
        <button
          className="button button-primary"
          onClick={() => {
            setCreating(true);
            setSelected(null);
          }}
        >
          <Plus size={17} />
          <WorkspaceText text=" Create content " />
        </button>
      </div>
      <details className="platform-panel">
        <summary>
          <WorkspaceText text="Private media library · " />
          {data.media?.length || 0} <WorkspaceText text=" files" />
        </summary>
        <p>
          <WorkspaceText text="Company assets only, scoped by role and department. Customer files never enter this library. Quarantined or rejected assets cannot be previewed, downloaded or published." />
        </p>
        <div className="document-list">
          {data.media?.map((file) => (
            <div key={file.id}>
              <strong>{file.name}</strong> <WorkspaceText text="·" />{" "}
              {file.department || w("Corporate")} <WorkspaceText text="·" />{" "}
              {(file.size / 1024).toFixed(1)} <WorkspaceText text="KB" />{" "}
              <Badge value={file.scan_state} />
              {file.scan_state === "clean" && (
                <a
                  className="platform-small-button"
                  href={`/api/platform/documents/${file.id}`}
                >
                  <WorkspaceText text="Download" />
                </a>
              )}
              <code>{file.id}</code>
            </div>
          ))}
        </div>
      </details>
      <div className="cms-studio-grid">
        <aside className="cms-record-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={selected === item.id ? "selected" : ""}
              onClick={() => {
                setCreating(false);
                setSelected(item.id);
              }}
            >
              <small>
                {item.type} <WorkspaceText text="· /" />
                {item.slug}
              </small>
              <strong>
                {String(
                  (item.data.title as { en?: string } | undefined)?.en ||
                    (item.data.name as string) ||
                    item.slug,
                )}
              </strong>
              <Badge value={item.revision_state} />
              <span>
                {item.published_revision_id
                  ? w("Live revision retained")
                  : w("Not public")}{" "}
                <WorkspaceText text="· v" />
                {item.version}
              </span>
            </button>
          ))}
        </aside>
        <div className="cms-editor-area">
          {creating ? (
            <>
              <FormField label="New content type">
                <select
                  value={newType}
                  onChange={(event) => setNewType(event.target.value)}
                >
                  {types
                    .filter((type) => type !== "service")
                    .map((type) => (
                      <option key={type} value={type}>
                        {w(type)}
                      </option>
                    ))}
                </select>
              </FormField>
              <ContentEditor
                key={`new:${newType}`}
                type={newType}
                data={data}
                refresh={refresh}
                onCreated={(id) => {
                  setCreating(false);
                  setSelected(id);
                }}
              />
            </>
          ) : record ? (
            <ContentEditor
              key={record.id}
              record={record}
              type={record.type}
              data={data}
              refresh={refresh}
            />
          ) : (
            <EmptyState title="A governed content studio.">
              <WorkspaceText text=" Choose a collection item or create a draft. The public site continues to show its previous approved revision until a new revision is approved and published. Service pages, FAQs, menus, company contacts, homepage order, articles and evidence records share this workflow. " />
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
function ContentEditor({
  record,
  type,
  data,
  refresh,
  onCreated,
}: {
  record?: ContentItem;
  type: string;
  data: WorkspaceData;
  refresh: () => Promise<void>;
  onCreated?: (id: string) => void;
}) {
  const w = useWorkspaceCopy();
  const interfaceLanguage = useSite().language;
  const { catalog } = useSite(),
    [form, setForm] = useState<Record<string, unknown>>(
      editableData(record?.data, type),
    ),
    [slug, setSlug] = useState(record?.slug || ""),
    [department, setDepartment] = useState(record?.department || ""),
    [source, setSource] = useState(record?.source_reference || ""),
    [version, setVersion] = useState(record?.version || 1),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [publishAt, setPublishAt] = useState(""),
    [expireAt, setExpireAt] = useState(""),
    [preview, setPreview] = useState(false),
    [previewLanguage, setPreviewLanguage] = useState<"en" | "sw">("en"),
    [mobilePreview, setMobilePreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [auto, setAuto] = useState(true),
    [history, setHistory] = useState<
      {
        id: string;
        version: number;
        state: string;
        data: Record<string, unknown>;
        author_id: string;
        created_at: string;
      }[]
    >([]),
    [file, setFile] = useState<File | null>(null),
    [uploadId, setUploadId] = useState("");
  const savingRef = useRef(false),
    editRevision = useRef(0);
  const save = async (automatic = false) => {
    if (savingRef.current) return;
    savingRef.current = true;
    const savingEdit = editRevision.current;
    setError("");
    try {
      const result = await platformApi<{ id: string; version: number }>(
        "admin/content",
        {
          id: record?.id,
          type,
          slug,
          department,
          expectedVersion: record ? version : undefined,
          data: form,
          sourceReference: source,
        },
      );
      setVersion(result.version);
      setDirty(editRevision.current !== savingEdit);
      setMessage(
        `${automatic ? "Autosaved" : "Saved"} draft version ${result.version}. Nothing was published.`,
      );
      await refresh();
      if (!record) onCreated?.(result.id);
    } catch (error) {
      setAuto(false);
      if (automatic)
        setError(
          error instanceof Error
            ? error.message
            : "Autosave failed. Your edits remain in this tab.",
        );
      else throw error;
    } finally {
      savingRef.current = false;
    }
  };
  useEffect(() => {
    if (!auto || !dirty || !record || source.trim().length < 10) return;
    const timer = setTimeout(() => void save(true), 4000);
    return () => clearTimeout(timer);
  }, [form, source, dirty, auto]);
  const change = (value: unknown) => {
    editRevision.current++;
    setForm(value as Record<string, unknown>);
    setDirty(true);
    setMessage("");
  };
  const action = async (name: string) => {
    if (!record) return;
    await platformApi("admin/content/action", {
      id: record.id,
      expectedVersion: version,
      action: name,
      reason,
      publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      expireAt: expireAt ? new Date(expireAt).toISOString() : undefined,
    });
    setVersion((value) => value + 1);
    setMessage(`Publication action recorded: ${name}.`);
    await refresh();
  };
  const canPublish = data.capabilities?.["content.publish"];
  return (
    <div className="cms-editor">
      <div className="platform-detail-heading">
        <div>
          <small>
            {type.toUpperCase()} <WorkspaceText text="·" />{" "}
            {record ? `VERSION ${version}` : w("NEW DRAFT")}
          </small>
          <h2>
            {record ? w("Make the next revision.") : w("Start with the facts.")}
          </h2>
        </div>
        <button
          className="platform-small-button"
          type="button"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={16} />
          {preview ? w("Edit fields") : w("Preview draft")}
        </button>
      </div>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      {preview ? (
        <div>
          <div className="publication-actions">
            <button
              type="button"
              className="platform-small-button"
              onClick={() =>
                setPreviewLanguage(previewLanguage === "en" ? "sw" : "en")
              }
            >
              {previewLanguage === "en"
                ? w("Preview Kiswahili")
                : w("Preview English")}
            </button>
            <button
              type="button"
              className="platform-small-button"
              onClick={() => setMobilePreview(!mobilePreview)}
            >
              {mobilePreview ? w("Desktop preview") : w("320px mobile preview")}
            </button>
          </div>
          <div
            className={`cms-preview${mobilePreview ? " is-mobile" : ""}`}
            lang={previewLanguage}
          >
            <span className="platform-kicker">
              <WorkspaceText text="UNPUBLISHED DRAFT PREVIEW" />
            </span>
            {typeof (form.image || form.heroImage) === "string" && (
              <img
                src={String(form.image || form.heroImage).replace(
                  "/api/platform/public-media/",
                  "/api/platform/company-media/",
                )}
                style={{
                  objectPosition: String(
                    mobilePreview
                      ? form.heroMobilePosition ||
                          form.mobileImagePosition ||
                          "center"
                      : form.heroPosition || form.imagePosition || "center",
                  ),
                }}
                alt={String(
                  (form.heroAlt as { en?: string; sw?: string } | undefined)?.[
                    previewLanguage
                  ] ||
                    (
                      form.imageAltLocalized as
                        { en?: string; sw?: string } | undefined
                    )?.[previewLanguage] ||
                    (
                      form.imageAlt as { en?: string; sw?: string } | undefined
                    )?.[previewLanguage] ||
                    "Draft content preview",
                )}
                width={800}
                height={400}
              />
            )}
            <h2>
              {String(
                (form.title as { en?: string; sw?: string } | undefined)?.[
                  previewLanguage
                ] ||
                  form.name ||
                  slug,
              )}
            </h2>
            <p>
              {String(
                (form.summary as { en?: string; sw?: string } | undefined)?.[
                  previewLanguage
                ] ||
                  (
                    form.description as { en?: string; sw?: string } | undefined
                  )?.[previewLanguage] ||
                  "",
              )}
            </p>
            <div className="editorial-body">
              {String(
                (form.body as { en?: string; sw?: string } | undefined)?.[
                  previewLanguage
                ] ||
                  (form.intro as { en?: string; sw?: string } | undefined)?.[
                    previewLanguage
                  ] ||
                  "",
              )}
            </div>
            <details>
              <summary>
                <WorkspaceText text="Compare current draft structure" />
              </summary>
              <pre>{JSON.stringify(form, null, 2)}</pre>
            </details>
          </div>
        </div>
      ) : (
        <ActionForm onSubmit={() => save()} label="Save draft revision">
          <div className="platform-two-col">
            <FormField
              label="URL slug"
              hint="Lowercase and hyphen-separated. Existing routes are immutable; use the redirect manager."
            >
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                disabled={!!record}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
                maxLength={120}
              />
            </FormField>
            <FormField label="Department scope">
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                disabled={!!record}
              >
                <option value="">
                  <WorkspaceText text="Corporate / shared" />
                </option>
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
          </div>
          <StructuredFields value={form} onChange={change} />
          <FormField
            label="Source reference / approval evidence"
            hint="Internal evidence is not exposed by the public content API. Never paste passwords, private keys or personal documents."
          >
            <textarea
              value={source}
              onChange={(event) => {
                editRevision.current++;
                setSource(event.target.value);
                setDirty(true);
              }}
              minLength={10}
              maxLength={2000}
              required
            />
          </FormField>
          {record && (
            <label className="platform-check">
              <input
                type="checkbox"
                checked={auto}
                onChange={(event) => setAuto(event.target.checked)}
              />
              <WorkspaceText text=" Autosave valid drafts after four seconds. This never publishes. " />
            </label>
          )}
        </ActionForm>
      )}
      {record && (
        <div className="cms-controls">
          <section className="platform-panel">
            <h3>
              <WorkspaceText text="Review & publication" />
            </h3>
            <p>
              <WorkspaceText text=" Current draft: " />
              <Badge value={record.revision_state} />
              <WorkspaceText text=". Public:" />{" "}
              {record.published_revision_id
                ? w("approved revision retained")
                : w("not published")}
              <WorkspaceText text="." />
            </p>
            <p>
              <WorkspaceText text=" Approval must be recorded by a different authorized publisher. Images, client references and testimonials also need documented permissions. " />
            </p>
            <FormField label="Decision / evidence">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
              />
            </FormField>
            {canPublish && (
              <div className="platform-two-col">
                <FormField label="Optional scheduled publication (local time)">
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(event) => setPublishAt(event.target.value)}
                  />
                </FormField>
                <FormField label="Optional expiration (local time)">
                  <input
                    type="datetime-local"
                    value={expireAt}
                    onChange={(event) => setExpireAt(event.target.value)}
                  />
                </FormField>
              </div>
            )}
            <div className="publication-actions">
              {[
                "submit",
                ...(canPublish
                  ? ["approve", "publish", "unpublish", "archive"]
                  : []),
              ].map((name) => (
                <ActionForm
                  key={name}
                  label={name}
                  disabled={dirty || reason.trim().length < 10}
                  onSubmit={() => action(name)}
                />
              ))}
            </div>
          </section>
          <section className="platform-panel">
            <h3>
              <History size={18} />
              <WorkspaceText text=" Revision history & restoration " />
            </h3>
            <button
              className="platform-small-button"
              onClick={async () => {
                try {
                  const result = await platformApi<{
                    revisions: typeof history;
                  }>(`content/${record.id}/history`);
                  setHistory(result.revisions);
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not load revisions.",
                  );
                }
              }}
            >
              <WorkspaceText text=" Load revision history " />
            </button>
            {history.map((revision) => (
              <details className="revision-card" key={revision.id}>
                <summary>
                  <WorkspaceText text=" Version " />
                  {revision.version} <WorkspaceText text="·" /> {revision.state}{" "}
                  <WorkspaceText text="·" /> {readableDate(revision.created_at)}
                </summary>
                <div className="platform-two-col">
                  <div>
                    <strong>
                      <WorkspaceText text="Selected revision" />
                    </strong>
                    <pre>{JSON.stringify(revision.data, null, 2)}</pre>
                  </div>
                  <div>
                    <strong>
                      <WorkspaceText text="Current editor" />
                    </strong>
                    <pre>{JSON.stringify(form, null, 2)}</pre>
                  </div>
                </div>
                <ActionForm
                  label={`Restore v${revision.version} as a new draft`}
                  onSubmit={async () => {
                    const response = await platformApi<{ version: number }>(
                      "admin/content",
                      {
                        id: record.id,
                        type,
                        slug,
                        department,
                        expectedVersion: version,
                        data: form,
                        sourceReference: source,
                        restoreRevisionId: revision.id,
                      },
                    );
                    setVersion(response.version);
                    setForm(revision.data);
                    setDirty(false);
                    setMessage(
                      `Restored as new draft v${response.version}. Publication still requires review.`,
                    );
                    await refresh();
                  }}
                />
              </details>
            ))}
          </section>
        </div>
      )}
      {[
        "page",
        "package",
        "menu",
        "career",
        "testimonial",
        "faq",
        "knowledge",
        "document",
        "gallery",
        "project",
        "team",
        "client",
        "article",
        "service",
        "homepage",
      ].includes(type) && (
        <details className="platform-panel">
          <summary>
            <Upload size={18} />
            <WorkspaceText text=" Approved media & company documents " />
          </summary>
          <p>
            <WorkspaceText text=" Only company-owned publication material belongs here. Customer files must stay in the inquiry document workflow. All uploads are quarantined; public publication is blocked until scanning and rights review pass. " />
          </p>
          <FormField label="Reuse a clean, authorized company asset">
            <select
              defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                change({
                  ...form,
                  documentId: event.target.value,
                  ...(type !== "document"
                    ? {
                        [type === "homepage" ? "heroImage" : "image"]:
                          `/api/platform/public-media/${event.target.value}`,
                      }
                    : {}),
                });
              }}
            >
              <option value="">
                <WorkspaceText text="Choose scanned asset" />
              </option>
              {data.media
                ?.filter(
                  (file) =>
                    file.scan_state === "clean" &&
                    (type === "document"
                      ? file.mime === "application/pdf"
                      : file.mime.startsWith("image/")) &&
                    (!file.department || file.department === department),
                )
                .map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
            </select>
          </FormField>
          <ActionForm
            label="Upload company material to quarantine"
            disabled={!file}
            onSubmit={async () => {
              if (!file) return;
              const response = await fetch(
                `/api/platform/documents/upload?scope=company&department=${encodeURIComponent(department)}&name=${encodeURIComponent(file.name)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/octet-stream" },
                  body: file,
                },
              );
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setUploadId(result.id);
              change({
                ...form,
                documentId: result.id,
                ...(type !== "document"
                  ? {
                      [type === "homepage" ? "heroImage" : "image"]:
                        `/api/platform/public-media/${result.id}`,
                    }
                  : {}),
              });
            }}
          >
            <FormField label="Company PDF or image">
              <input
                type="file"
                accept={type === "document" ? ".pdf" : ".jpg,.jpeg,.png,.webp"}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </FormField>
          </ActionForm>
          {uploadId && (
            <Notice>
              <WorkspaceText text=" Stored in private quarantine: " />
              {uploadId}
              <WorkspaceText text=". Save the draft, run the configured scan worker, then obtain approval before publication. " />
            </Notice>
          )}
        </details>
      )}
    </div>
  );
}
