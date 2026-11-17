"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
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
import type {
  BookingRecord,
  ProjectRecord,
  VisitRecord,
  WorkspaceData,
} from "./platform-types";

export function OperationsWorkspace({
  data,
  staff,
  refresh,
  view = "bookings",
}: {
  data: WorkspaceData;
  staff: boolean;
  refresh: () => Promise<void>;
  view?: "bookings" | "projects" | "visits";
}) {
  const [create, setCreate] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const active = data.bookings.find((booking) => booking.id === selected);
  if (view === "projects")
    return (
      <div className="platform-card-stack">
        {data.projects.length ? (
          data.projects.map((project) => (
            <ProjectCard
              key={`${project.id}:${project.version}`}
              project={project}
              staff={staff && !!data.capabilities?.["project.edit"]}
              refresh={refresh}
            />
          ))
        ) : (
          <EmptyState title="Delivery timelines start with an authorized booking.">
            <WorkspaceText text=" Projects preserve concrete milestones and acceptance evidence instead of inventing a percentage of completion. " />
          </EmptyState>
        )}
      </div>
    );
  if (view === "visits")
    return (
      <div className="platform-card-stack">
        {data.visits.length ? (
          data.visits.map((visit) => (
            <VisitCard
              key={`${visit.id}:${visit.version}`}
              visit={visit}
              data={data}
              staff={staff}
              refresh={refresh}
            />
          ))
        ) : (
          <EmptyState title="No scheduled service visits.">
            <WorkspaceText text=" Cleaning contracts keep a separate schedule, checklist and supervisor-review record for every visit. " />
          </EmptyState>
        )}
      </div>
    );
  return (
    <>
      {staff && data.capabilities?.["booking.manage"] && (
        <div className="platform-toolbar">
          <p>
            <WorkspaceText text="An accepted offer is not a confirmed booking." />
          </p>
          <button
            className="button button-primary"
            onClick={() => setCreate(!create)}
          >
            <Plus size={17} />
            <WorkspaceText text=" Prepare booking " />
          </button>
        </div>
      )}
      {create && (
        <BookingEditor
          data={data}
          refresh={async () => {
            await refresh();
            setCreate(false);
          }}
        />
      )}
      <div className="inquiry-workspace-grid">
        <div className="platform-record-list">
          {data.bookings.length ? (
            data.bookings.map((booking) => (
              <button
                key={booking.id}
                className={selected === booking.id ? "selected" : ""}
                onClick={() => setSelected(booking.id)}
              >
                <span className="record-topline">
                  <strong>{booking.reference}</strong>
                  <Badge value={booking.status} />
                </span>
                <span>{readableDate(booking.starts_at)}</span>
                <small>
                  {
                    data.inquiries.find(
                      (inquiry) => inquiry.id === booking.inquiry_id,
                    )?.reference
                  }
                </small>
              </button>
            ))
          ) : (
            <EmptyState title="No bookings yet.">
              <WorkspaceText text=" Only a current accepted quotation can progress to a pending booking, followed by explicit operational approval. " />
            </EmptyState>
          )}
        </div>
        <div className="platform-record-detail">
          {active ? (
            <>
              <div className="platform-detail-heading">
                <div>
                  <small>{active.reference}</small>
                  <h2>
                    <WorkspaceText text="Agreed work, coordinated." />
                  </h2>
                </div>
                <Badge value={active.status} />
              </div>
              <dl className="platform-description-list">
                <div>
                  <dt>
                    <WorkspaceText text="Starts" />
                  </dt>
                  <dd>
                    {readableDate(active.starts_at)}{" "}
                    <WorkspaceText text="EAT" />
                  </dd>
                </div>
                <div>
                  <dt>
                    <WorkspaceText text="Ends / contract horizon" />
                  </dt>
                  <dd>
                    {readableDate(active.ends_at)} <WorkspaceText text="EAT" />
                  </dd>
                </div>
                {staff && (
                  <div>
                    <dt>
                      <WorkspaceText text="Team arrangements · internal" />
                    </dt>
                    <dd>{active.team}</dd>
                  </div>
                )}
              </dl>
              {active.status === "pending" && (
                <Notice>
                  <WorkspaceText text=" This record is pending. It is not a commitment until authorized operations staff confirm the conditions and resource availability. " />
                </Notice>
              )}
              {staff && data.capabilities?.["booking.manage"] && (
                <BookingActions
                  key={`${active.id}:${active.version}`}
                  booking={active}
                  data={data}
                  refresh={refresh}
                />
              )}
              <h3>
                <WorkspaceText text="Scheduled visits & quality records" />
              </h3>
              {data.visits
                .filter((visit) => visit.booking_id === active.id)
                .map((visit) => (
                  <VisitCard
                    key={`${visit.id}:${visit.version}`}
                    visit={visit}
                    data={data}
                    staff={staff && !!data.capabilities?.["booking.manage"]}
                    refresh={refresh}
                  />
                ))}
              <h3>
                <WorkspaceText text="Delivery milestones" />
              </h3>
              {data.projects
                .filter((project) => project.booking_id === active.id)
                .map((project) => (
                  <ProjectCard
                    key={`${project.id}:${project.version}`}
                    project={project}
                    staff={staff && !!data.capabilities?.["project.edit"]}
                    refresh={refresh}
                  />
                ))}
            </>
          ) : (
            <EmptyState title="Choose a booking to see its schedule.">
              <WorkspaceText text=" Dates, resource allocations, delivery evidence and quality records remain linked to the accepted quotation version. " />
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
function BookingEditor({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [quote, setQuote] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [supervisor, setSupervisor] = useState(""),
    [team, setTeam] = useState(""),
    [frequency, setFrequency] = useState("once"),
    [visits, setVisits] = useState(1),
    [resources, setResources] = useState<Record<string, number>>({});
  const selectedOffer = data.quotations.find((offer) => offer.id === quote);
  const divisions = selectedOffer?.snapshot.departments || [];
  const scopedResources = (data.resources || []).filter((resource) =>
    divisions.includes(resource.department),
  );
  return (
    <section className="platform-panel">
      <h2>
        <WorkspaceText text="Prepare a pending booking" />
      </h2>
      <ActionForm
        label="Create pending booking — not confirmed"
        onSubmit={async () => {
          await platformApi("admin/bookings", {
            quotationVersionId: quote,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            supervisorId: supervisor,
            team,
            resources: Object.entries(resources)
              .filter(([, quantity]) => quantity > 0)
              .map(([id, quantity]) => ({ id, quantity })),
            frequency,
            visits,
          });
          await refresh();
        }}
      >
        <FormField label="Current accepted quotation">
          <select
            value={quote}
            onChange={(event) => {
              setQuote(event.target.value);
              setSupervisor("");
              setResources({});
              setFrequency("once");
              setVisits(1);
            }}
            required
          >
            <option value="">
              <WorkspaceText text="Choose an accepted offer" />
            </option>
            {data.quotations
              .filter(
                (quote) =>
                  quote.status === "accepted" &&
                  quote.current_version === quote.version,
              )
              .map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.reference} <WorkspaceText text="v" />
                  {quote.version} <WorkspaceText text="—" />{" "}
                  {quote.snapshot.customer.name}
                </option>
              ))}
          </select>
        </FormField>
        <div className="platform-two-col">
          <FormField label="First start (your local time)">
            <input
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </FormField>
          <FormField label="First visit end (your local time)">
            <input
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Assigned supervisor">
            <select
              value={supervisor}
              onChange={(event) => setSupervisor(event.target.value)}
              required
            >
              <option value="">
                <WorkspaceText text="Select authorized supervisor" />
              </option>
              {data.directory
                ?.filter(
                  (user) =>
                    user.roles.some((role) =>
                      ["operations", "department_manager"].includes(role),
                    ) &&
                    user.departments.some((department) =>
                      divisions.includes(department),
                    ),
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Cleaning recurrence">
            <select
              value={frequency}
              disabled={!divisions.includes("general-cleaning")}
              onChange={(event) => {
                setFrequency(event.target.value);
                if (event.target.value === "once") setVisits(1);
              }}
            >
              {["once", "daily", "weekly", "monthly"].map((value) => (
                <option key={value} value={value}>
                  {w(value)}
                </option>
              ))}
            </select>
          </FormField>
          {frequency !== "once" && (
            <FormField label="Number of visits (max 52)">
              <input
                type="number"
                min={1}
                max={52}
                value={visits}
                onChange={(event) => setVisits(Number(event.target.value))}
                required
              />
            </FormField>
          )}
        </div>
        <FormField label="Team & delivery arrangements">
          <textarea
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            minLength={3}
            maxLength={2000}
            required
          />
        </FormField>
        <fieldset className="platform-panel">
          <legend>
            <WorkspaceText text="Resource allocations" />
          </legend>
          <p>
            <WorkspaceText text=" Unassigned resources are not implicitly reserved. Register exclusive staff and equipment as resources. Recurring contracts conservatively hold allocations across the contract horizon. " />
          </p>
          {!quote && (
            <p>
              {w("Choose an accepted offer to see resources in its divisions.")}
            </p>
          )}
          {quote && !scopedResources.length && (
            <p>
              {w(
                "No registered resources in this scope. Record staff and equipment arrangements before confirmation.",
              )}
            </p>
          )}
          {scopedResources.map((resource) => (
            <FormField
              key={resource.id}
              label={`${resource.name} · ${w(resource.state)} · ${w("Capacity")} ${resource.quantity}`}
            >
              <input
                type="number"
                min={0}
                max={resource.quantity}
                value={resources[resource.id] || 0}
                onChange={(event) =>
                  setResources((previous) => ({
                    ...previous,
                    [resource.id]: Number(event.target.value),
                  }))
                }
              />
            </FormField>
          ))}
        </fieldset>
      </ActionForm>
    </section>
  );
}
function BookingActions({
  booking,
  data,
  refresh,
}: {
  booking: BookingRecord;
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [reason, setReason] = useState(""),
    [conditions, setConditions] = useState({
      contract: false,
      payment: false,
      staff: false,
      resources: false,
      safety: false,
      permits: false,
      musicRights: false,
      electrical: false,
      rigging: false,
      equipmentInspection: false,
      competentCrew: false,
    });
  const actions =
    booking.status === "pending"
      ? [
          ...(data.capabilities?.["booking.confirm"] ? ["confirm"] : []),
          "cancel",
        ]
      : booking.status === "confirmed"
        ? ["start", "cancel"]
        : booking.status === "in_progress"
          ? ["complete", "cancel"]
          : [];
  return actions.length ? (
    <details className="platform-panel">
      <summary>
        <WorkspaceText text="Operational authority & checks" />
      </summary>
      {booking.status === "pending" &&
        Object.keys(conditions)
          .filter(
            (key) =>
              ["contract", "payment", "staff", "resources", "safety"].includes(
                key,
              ) ||
              (() => {
                const inquiry = data.inquiries.find(
                  (row) => row.id === booking.inquiry_id,
                );
                return (
                  !!inquiry &&
                  [
                    inquiry.work.department,
                    ...(inquiry.additionalServices || []),
                  ].some((department) =>
                    ["event-management", "entertainment"].includes(department),
                  )
                );
              })(),
          )
          .map((key) => (
            <label className="platform-check" key={key}>
              <input
                type="checkbox"
                checked={conditions[key as keyof typeof conditions]}
                onChange={(event) =>
                  setConditions((previous) => ({
                    ...previous,
                    [key]: event.target.checked,
                  }))
                }
              />
              {w(
                {
                  permits:
                    "Event / venue permits checked, or not-applicable grounds documented",
                  musicRights:
                    "Performance permissions and music rights checked",
                  electrical: "Electrical safety checked",
                  rigging: "Safe rigging and venue restrictions checked",
                  equipmentInspection:
                    "Equipment inspection and maintenance checked",
                  competentCrew: "Competent technical personnel confirmed",
                  contract: "Contract and work authorization reviewed",
                  payment:
                    "Deposit / payment conditions verified (or documented as not applicable)",
                  staff: "Staffing and supervisor availability checked",
                  resources:
                    "Equipment, suppliers, transport and date conflicts checked",
                  safety:
                    "Safety, permits, rights and venue restrictions reviewed",
                }[key] || key,
              )}
            </label>
          ))}
      <FormField label="Decision evidence / conditions">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={10}
          maxLength={2000}
        />
      </FormField>
      <div className="publication-actions">
        {actions.map((action) => (
          <ActionForm
            key={action}
            label={`${action} booking`}
            disabled={reason.trim().length < 10}
            onSubmit={async () => {
              await platformApi("admin/bookings/action", {
                id: booking.id,
                expectedVersion: booking.version,
                action,
                conditions,
                reason,
              });
              await refresh();
            }}
          />
        ))}
      </div>
    </details>
  ) : null;
}
function VisitCard({
  visit,
  staff,
  data,
  refresh,
}: {
  visit: VisitRecord;
  staff: boolean;
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [checklist, setChecklist] = useState(visit.checklist),
    [issues, setIssues] = useState(visit.issues),
    [action, setAction] = useState("save");
  return (
    <details className="platform-panel visit-card">
      <summary>
        <span>
          {readableDate(visit.starts_at)} <WorkspaceText text="EAT" />
        </span>
        <Badge value={visit.status} />
      </summary>
      <p>{visit.team}</p>
      {staff && visit.status !== "completed" ? (
        <ActionForm
          label="Save quality record"
          onSubmit={async () => {
            await platformApi("admin/visits", {
              id: visit.id,
              expectedVersion: visit.version,
              checklist,
              issues,
              action,
            });
            await refresh();
          }}
        >
          {checklist.map((item, index) => (
            <label className="platform-check" key={item.label}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={(event) =>
                  setChecklist((previous) =>
                    previous.map((entry, i) =>
                      i === index
                        ? { ...entry, done: event.target.checked }
                        : entry,
                    ),
                  )
                }
              />
              {item.label}
            </label>
          ))}
          <FormField label="Internal quality issues / handover notes">
            <textarea
              value={issues}
              onChange={(event) => setIssues(event.target.value)}
              maxLength={3000}
            />
          </FormField>
          <FormField label="Action">
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="save">
                <WorkspaceText text="Save checklist progress" />
              </option>
              <option value="submit">
                <WorkspaceText text=" Submit completed checklist for review " />
              </option>
              <option value="review">
                <WorkspaceText text="Record assigned supervisor review" />
              </option>
            </select>
          </FormField>
        </ActionForm>
      ) : (
        <>
          <ul className="delivery-checklist">
            {checklist.map((item) => (
              <li key={item.label}>
                <span>{item.done ? <Check size={16} /> : w("—")}</span>
                {item.label}
              </li>
            ))}
          </ul>
          {issues && <p>{issues}</p>}
        </>
      )}
    </details>
  );
}
function ProjectCard({
  project,
  staff,
  refresh,
}: {
  project: ProjectRecord;
  staff: boolean;
  refresh: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState(""),
    [publicUpdate, setPublicUpdate] = useState("");
  const next = project.milestones.findIndex((milestone) => !milestone.complete);
  return (
    <section className="platform-panel">
      <div className="platform-detail-heading">
        <div>
          <small>{project.department}</small>
          <h3>{project.title}</h3>
        </div>
        <Badge value={next === -1 ? "completed" : "in_progress"} />
      </div>
      <ol className="project-timeline">
        {project.milestones.map((milestone, index) => (
          <li
            key={milestone.label}
            className={milestone.complete ? "complete" : ""}
          >
            <span>{milestone.complete ? <Check size={17} /> : index + 1}</span>
            <div>
              <strong>{milestone.label}</strong>
              {milestone.complete ? (
                <>
                  <small>{readableDate(milestone.completedAt)}</small>
                  {staff && <p>{milestone.evidence}</p>}
                  {milestone.publicUpdate && <p>{milestone.publicUpdate}</p>}
                </>
              ) : (
                <small>
                  <WorkspaceText text="Evidence not yet recorded" />
                </small>
              )}
            </div>
          </li>
        ))}
      </ol>
      {staff && next !== -1 && (
        <ActionForm
          label={`Record ${project.milestones[next].label}`}
          onSubmit={async () => {
            await platformApi("admin/projects/milestone", {
              id: project.id,
              expectedVersion: project.version,
              index: next,
              evidence,
              publicUpdate,
            });
            await refresh();
          }}
        >
          <FormField
            label="Internal evidence / acceptance record"
            hint="Record the concrete result, authorization or handover evidence. Evidence stays internal; never include credentials."
          >
            <textarea
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              minLength={10}
              maxLength={4000}
              required
            />
          </FormField>
          <FormField
            label="Reviewed customer-visible progress update (optional)"
            hint="Only this separate summary is shared in the customer portal."
          >
            <textarea
              value={publicUpdate}
              onChange={(event) => setPublicUpdate(event.target.value)}
              maxLength={1000}
            />
          </FormField>
        </ActionForm>
      )}
    </section>
  );
}
export function ResourcesWorkspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const interfaceLanguage = useSite().language;
  const { catalog } = useSite(),
    [name, setName] = useState(""),
    [department, setDepartment] = useState(
      data.user.departments[0] || "event-management",
    ),
    [category, setCategory] = useState("equipment"),
    [ownership, setOwnership] = useState("owned"),
    [supplierId, setSupplierId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [maintenance, setMaintenance] = useState(""),
    [published, setPublished] = useState(false),
    [location, setLocation] = useState(""),
    [conditionNote, setConditionNote] = useState(""),
    [publicationEvidence, setPublicationEvidence] = useState(""),
    [resourceVersion, setResourceVersion] = useState<number | undefined>(),
    [state, setState] = useState("available"),
    [editingId, setEditingId] = useState<string | undefined>();
  return (
    <div className="platform-two-col">
      <section className="platform-panel">
        <h2>{editingId ? w("Update resource") : w("Register a resource")}</h2>
        <Notice>
          <WorkspaceText text=" Catalogue visibility is not proof of date availability. Ownership, capacity and maintenance records must be accurate. Active allocations must be resolved before changing a resource. " />
        </Notice>
        <ActionForm
          label="Save resource"
          onSubmit={async () => {
            await platformApi("admin/resources", {
              id: editingId,
              expectedVersion: resourceVersion,
              resource: {
                name,
                department,
                category,
                ownership,
                quantity,
                state,
                maintenanceDue: maintenance || null,
                published,
                location,
                conditionNote,
                publicationEvidence,
                supplierId: ownership === "owned" ? null : supplierId || null,
              },
            });
            setName("");
            setEditingId(undefined);
            setResourceVersion(undefined);
            setLocation("");
            setConditionNote("");
            setPublicationEvidence("");
            setPublished(false);
            setSupplierId("");
            setCategory("equipment");
            setOwnership("owned");
            setQuantity(1);
            setMaintenance("");
            setState("available");
            await refresh();
          }}
        >
          <FormField label="Resource name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={3}
              maxLength={150}
              required
            />
          </FormField>
          <FormField label="Department">
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
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
          <div className="platform-two-col">
            <FormField label="Category">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {[
                  "sound",
                  "lighting",
                  "display",
                  "camera",
                  "equipment",
                  "vehicle",
                  "personnel",
                  "other",
                ].map((value) => (
                  <option key={value} value={value}>
                    {w(value)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Ownership">
              <select
                value={ownership}
                onChange={(event) => setOwnership(event.target.value)}
              >
                {["owned", "hired", "partner"].map((value) => (
                  <option key={value} value={value}>
                    {w(value)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Capacity">
              <input
                type="number"
                min={1}
                max={100000}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                required
              />
            </FormField>
            <FormField label="State">
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                {["available", "maintenance", "unavailable"].map((value) => (
                  <option key={value} value={value}>
                    {w(value)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {ownership !== "owned" && (
            <FormField label="Supplier arrangement (internal)">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">
                  <WorkspaceText text="Choose a supplier before booking confirmation" />
                </option>
                {data.suppliers
                  ?.filter((s) => s.department === department)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} <WorkspaceText text="·" /> {s.state}
                    </option>
                  ))}
              </select>
            </FormField>
          )}
          <FormField label="Storage / operating location (internal)">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={200}
            />
          </FormField>
          <FormField label="Condition / inspection note (internal)">
            <textarea
              value={conditionNote}
              onChange={(event) => setConditionNote(event.target.value)}
              maxLength={2000}
            />
          </FormField>
          <FormField label="Public catalogue approval evidence (internal)">
            <textarea
              value={publicationEvidence}
              onChange={(event) => setPublicationEvidence(event.target.value)}
              minLength={published ? 10 : undefined}
              maxLength={2000}
            />
          </FormField>
          <FormField label="Maintenance due">
            <input
              type="date"
              value={maintenance}
              onChange={(event) => setMaintenance(event.target.value)}
            />
          </FormField>
          <label className="platform-check">
            <input
              type="checkbox"
              checked={published}
              disabled={!data.capabilities?.["resource.publish"]}
              onChange={(event) => setPublished(event.target.checked)}
            />
            <WorkspaceText text=" Approved for public catalogue display " />
          </label>
        </ActionForm>
      </section>
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Resource register" />
        </h2>
        {data.resources?.length ? (
          data.resources.map((resource) => (
            <article key={resource.id} className="resource-card">
              <h3>{resource.name}</h3>
              <p>
                {resource.department} <WorkspaceText text="·" />{" "}
                {resource.ownership} <WorkspaceText text=" · quantity" />{" "}
                {resource.quantity}
              </p>
              <Badge value={resource.state} />
              <button
                className="platform-small-button"
                onClick={() => {
                  setEditingId(resource.id);
                  setName(resource.name);
                  setDepartment(resource.department);
                  setCategory(resource.category);
                  setOwnership(resource.ownership);
                  setSupplierId(resource.supplier_id || "");
                  setQuantity(resource.quantity);
                  setState(resource.state);
                  setMaintenance(resource.maintenance_due || "");
                  setPublished(!!resource.published);
                  setLocation(resource.location || "");
                  setConditionNote(resource.condition_note || "");
                  setPublicationEvidence(resource.publication_evidence || "");
                  setResourceVersion(resource.version);
                }}
              >
                <WorkspaceText text=" Edit resource " />
              </button>
            </article>
          ))
        ) : (
          <EmptyState title="No resources registered.">
            <WorkspaceText text=" Record actual assets and authorized partner arrangements before making availability claims. " />
          </EmptyState>
        )}
      </section>
    </div>
  );
}
