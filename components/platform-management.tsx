"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import { useState } from "react";
import { ArrowUpRight, Check, Plus, Search, Trash2 } from "lucide-react";
import { useSite } from "./site-shell";
import { PrivacyPanel } from "./platform-privacy";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  money,
  Notice,
  platformApi,
  PreviewLinks,
  readableDate,
  StructuredFields,
} from "./platform-shared";
import type { AccountUser, PriceBook, WorkspaceData } from "./platform-types";

export function PricingWorkspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const interfaceLanguage = useSite().language;
  const { catalog } = useSite(),
    [name, setName] = useState(""),
    [department, setDepartment] = useState(
      data.user.departments[0] || "catering",
    ),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [rules, setRules] = useState<PriceBook["rules"]>([
      {
        id: "",
        description: "",
        unit: "person",
        unitPrice: "",
        taxBps: 0,
        taxInclusive: false,
        public: false,
      },
    ]);
  return (
    <div className="platform-two-col">
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Versioned price books" />
        </h2>
        <Notice>
          <WorkspaceText text=" No TOC prices or tax rates have been invented. Propose real business-approved rules here. A different finance officer with delegated pricing authority must approve them. A changed rate requires a new book; historical quote snapshots remain unchanged. " />
        </Notice>
        <ActionForm
          label="Propose price book"
          onSubmit={async () => {
            await platformApi("admin/pricing", {
              name,
              department,
              effectiveFrom: new Date(from).toISOString(),
              effectiveTo: new Date(to).toISOString(),
              rules,
            });
            setName("");
            await refresh();
          }}
        >
          <FormField label="Price-book name / version">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={3}
              maxLength={100}
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
            <FormField label="Effective from (local time)">
              <input
                type="datetime-local"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                required
              />
            </FormField>
            <FormField label="Effective until (local time)">
              <input
                type="datetime-local"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                required
              />
            </FormField>
          </div>
          <StructuredFields
            value={rules}
            path="Approved rate proposals"
            onChange={(value) => setRules(value as typeof rules)}
          />
          <p>
            <WorkspaceText text=" Tax is in basis points: 100 = 1%. A public rule is visible only after approval and within its effective dates. Transport, staffing and regional adjustments can be represented as separate approved line rules. " />
          </p>
        </ActionForm>
      </section>
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Review queue & history" />
        </h2>
        {data.priceBooks?.length ? (
          data.priceBooks.map((book) => (
            <PriceBookCard
              key={book.id + book.state}
              book={book}
              canApprove={!!data.capabilities?.["pricing.approve"]}
              refresh={refresh}
            />
          ))
        ) : (
          <EmptyState title="No approved rates configured.">
            <WorkspaceText text=" Public enquiries correctly request a detailed assessment instead of displaying a made-up estimate. " />
          </EmptyState>
        )}
      </section>
    </div>
  );
}
function PriceBookCard({
  book,
  canApprove,
  refresh,
}: {
  book: PriceBook;
  canApprove: boolean;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [reason, setReason] = useState("");
  return (
    <details className="platform-panel">
      <summary>
        <strong>{book.name}</strong>
        <Badge value={book.state} />
      </summary>
      <p>
        {book.department} <WorkspaceText text="·" />{" "}
        {readableDate(book.effective_from)} <WorkspaceText text=" to" />{" "}
        {readableDate(book.effective_to)}
      </p>
      {book.rules.map((rule) => (
        <p key={rule.id}>
          <strong>{rule.description}</strong> <WorkspaceText text="· TZS" />{" "}
          {rule.unitPrice} <WorkspaceText text="/" /> {rule.unit}{" "}
          <WorkspaceText text=" · tax " />
          {rule.taxBps / 100}
          <WorkspaceText text="% ·" />{" "}
          {rule.public ? w("public estimate eligible") : w("internal only")}
        </p>
      ))}
      {canApprove && book.state === "draft" && (
        <ActionForm
          label="Record delegated price-book approval"
          onSubmit={async () => {
            await platformApi("admin/pricing/approve", { id: book.id, reason });
            await refresh();
          }}
        >
          <FormField label="Approval evidence">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={2000}
              required
            />
          </FormField>
        </ActionForm>
      )}
    </details>
  );
}
export function UsersWorkspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [links, setLinks] = useState<string[]>([]),
    [selected, setSelected] = useState("");
  const user = data.users?.find((user) => user.id === selected);
  return (
    <>
      <Notice>
        <WorkspaceText text=" System administration does not grant commercial approval. Roles, department scopes and delegated quotation, pricing and booking authorities are separate. Access changes revoke existing sessions. Staff must set up MFA. Your own privileges require a different administrator. " />
      </Notice>
      <div className="platform-two-col">
        <section className="platform-panel">
          <h2>
            <WorkspaceText text="Invite an account" />
          </h2>
          <ActionForm
            label="Prepare account invitation"
            onSubmit={async () => {
              const response = await platformApi<{
                id: string;
                previewLinks?: string[];
              }>("admin/users/invite", { name, email });
              setLinks(response.previewLinks || []);
              setName("");
              setEmail("");
              await refresh();
            }}
          >
            <FormField label="Name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
              />
            </FormField>
          </ActionForm>
          <PreviewLinks links={links} />
          <h3>
            <WorkspaceText text="Accounts" />
          </h3>
          <div className="platform-record-list">
            {data.users?.map((user) => (
              <button
                key={user.id}
                className={selected === user.id ? "selected" : ""}
                onClick={() => setSelected(user.id)}
              >
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>{user.roles.join(" · ")}</small>
                <span>
                  {user.verified_at
                    ? w("Email verified")
                    : w("Email verification pending")}{" "}
                  <WorkspaceText text=" · MFA " />
                  {user.mfa_enabled ? w("registered") : w("not registered")}
                </span>
                <Badge value={user.state} />
              </button>
            ))}
          </div>
        </section>
        <section className="platform-panel">
          {user ? (
            <AccessEditor
              key={user.id + user.state + JSON.stringify(user.roles)}
              user={user}
              refresh={refresh}
            />
          ) : (
            <EmptyState title="Choose an account to review its access.">
              <WorkspaceText text=" Invite new staff, verify their identity, then grant only the specific roles, departments and delegated business authority they need. " />
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
function AccessEditor({
  user,
  refresh,
}: {
  user: AccountUser;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const interfaceLanguage = useSite().language;
  const { catalog } = useSite(),
    [roles, setRoles] = useState(user.roles),
    [departments, setDepartments] = useState(user.departments),
    [state, setState] = useState(user.state),
    [authority, setAuthority] = useState({
      quotation: !!user.authority.quotation,
      pricing: !!user.authority.pricing,
      booking: !!user.authority.booking,
    }),
    [maxQuotation, setMaxQuotation] = useState(
      (user.authority.maxQuotationMinor || 0) / 100,
    ),
    [maxDiscount, setMaxDiscount] = useState(
      (user.authority.maxDiscountBps || 0) / 100,
    ),
    [reason, setReason] = useState(""),
    [identity, setIdentity] = useState(false);
  return (
    <>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <ActionForm
        label="Confirm access change & revoke old sessions"
        onSubmit={async () => {
          await platformApi("admin/users/access", {
            id: user.id,
            roles,
            departments,
            authority: {
              ...authority,
              maxQuotationMinor: Math.round(maxQuotation * 100),
              maxDiscountBps: Math.round(maxDiscount * 100),
            },
            state,
            reason,
          });
          await refresh();
        }}
      >
        <fieldset className="platform-panel">
          <legend>
            <WorkspaceText text="Assigned roles" />
          </legend>
          {[
            "administrator",
            "publisher",
            "editor",
            "marketing",
            "department_manager",
            "finance",
            "operations",
            "auditor",
            "customer",
          ].map((role) => (
            <label key={role} className="platform-check">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={(event) =>
                  setRoles(
                    event.target.checked
                      ? [...roles, role]
                      : roles.filter((item) => item !== role),
                  )
                }
              />
              {w(role.replaceAll("_", " "))}
            </label>
          ))}
        </fieldset>
        <fieldset className="platform-panel">
          <legend>
            <WorkspaceText text="Department access" />
          </legend>
          {catalog.map((service) => (
            <label key={service.slug} className="platform-check">
              <input
                type="checkbox"
                checked={departments.includes(service.slug)}
                onChange={(event) =>
                  setDepartments(
                    event.target.checked
                      ? [...departments, service.slug]
                      : departments.filter((item) => item !== service.slug),
                  )
                }
              />
              {service.title[interfaceLanguage]}
            </label>
          ))}
        </fieldset>
        <fieldset className="platform-panel">
          <legend>
            <WorkspaceText text="Explicit delegated business authority" />
          </legend>
          {Object.keys(authority).map((key) => (
            <label key={key} className="platform-check">
              <input
                type="checkbox"
                checked={authority[key as keyof typeof authority]}
                onChange={(event) =>
                  setAuthority((previous) => ({
                    ...previous,
                    [key]: event.target.checked,
                  }))
                }
              />
              {key}{" "}
              <WorkspaceText text=" approval — requires the appropriate finance / operations role too " />
            </label>
          ))}
        </fieldset>
        <div className="platform-two-col">
          <FormField label="Delegated quotation ceiling · TZS">
            <input
              type="number"
              min="0"
              max="9000000000"
              step="0.01"
              value={maxQuotation}
              onChange={(event) => setMaxQuotation(Number(event.target.value))}
              required
            />
          </FormField>
          <FormField label="Maximum delegated discount · %">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={maxDiscount}
              onChange={(event) => setMaxDiscount(Number(event.target.value))}
              required
            />
          </FormField>
        </div>
        <p>
          <WorkspaceText text="Zero means no financial value / no discount is authorized. Final approval also requires finance role, every included department, explicit quotation delegation and independent reviews." />
        </p>
        <FormField label="Account state">
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="active">
              <WorkspaceText text="Active" />
            </option>
            <option value="suspended">
              <WorkspaceText text="Suspended" />
            </option>
          </select>
        </FormField>
        <FormField label="Delegation / access-review evidence">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={1000}
            required
          />
        </FormField>
      </ActionForm>
      <details className="platform-panel">
        <summary>
          <WorkspaceText text="Authenticator recovery" />
        </summary>
        <p>
          <WorkspaceText text=" Verify the staff member's identity outside this website before resetting MFA. This revokes all existing sessions and requires setup at the next sign-in. " />
        </p>
        <label className="platform-check">
          <input
            type="checkbox"
            checked={identity}
            onChange={(event) => setIdentity(event.target.checked)}
          />
          <WorkspaceText text=" I independently verified the account holder's identity " />
        </label>
        <ActionForm
          label="Reset authenticator after identity verification"
          disabled={!identity || reason.length < 20}
          onSubmit={async () => {
            await platformApi("admin/users/reset-mfa", {
              id: user.id,
              reason,
              identityVerified: identity,
            });
            await refresh();
          }}
        />
      </details>
    </>
  );
}
export function ReportsWorkspace({ data }: { data: WorkspaceData }) {
  const w = useWorkspaceCopy();
  const [filtered, setFiltered] = useState(data.report),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [division, setDivision] = useState("");
  const report = filtered;
  if (!report)
    return (
      <EmptyState title="Reporting is restricted to authorized operational roles." />
    );
  return (
    <>
      <ActionForm
        label="Apply report cohort"
        onSubmit={async () => {
          const params = new URLSearchParams();
          if (from) params.set("from", from);
          if (to) params.set("to", to);
          if (division) params.set("division", division);
          setFiltered(await platformApi(`reports?${params}`));
        }}
      >
        <div className="platform-three-col">
          <FormField label="Inquiry created from · EAT">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField label="Inquiry created until · EAT">
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
          <FormField label="Division">
            <select
              value={division}
              onChange={(event) => setDivision(event.target.value)}
            >
              <option value="">
                <WorkspaceText text="All authorized divisions" />
              </option>
              {data.user.departments.map((department) => (
                <option key={department} value={department}>
                  {w(department)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </ActionForm>
      <p>
        {report.period} <WorkspaceText text=" · Calculated " />
        {readableDate(report.asOf)} <WorkspaceText text="EAT" />
      </p>
      <div className="platform-metrics">
        {[
          ["Valid inquiries", report.inquiries],
          ["Staff-qualified inquiries", report.qualifiedInquiries],
          ["Reviewed lost opportunities", report.lostOpportunities],
          [
            "First meaningful response · hours",
            report.averageResponseHours === null
              ? "No recorded staff response"
              : report.averageResponseHours.toFixed(1),
          ],
          [
            "Qualified-to-first-offer · hours",
            report.averageQualifiedQuotationTurnaroundHours === null
              ? "No qualifying durations"
              : report.averageQualifiedQuotationTurnaroundHours.toFixed(1),
          ],
          [
            "Qualified issuance rate",
            report.qualifiedIssuanceRate === null
              ? "No qualified inquiries"
              : `${(report.qualifiedIssuanceRate * 100).toFixed(1)}%`,
          ],
          [
            "Qualified booking conversion",
            report.qualifiedBookingConversion === null
              ? "No qualified inquiries"
              : `${(report.qualifiedBookingConversion * 100).toFixed(1)}%`,
          ],
          ["Issued quote versions", report.issuedVersions],
          ["Accepted current versions", report.acceptedVersions],
          ["Pending approvals", report.pendingApprovals],
          ["Declined / expired offers", report.lostOffers],
          [
            "Average first-offer hours",
            report.averageQuotationTurnaroundHours === null
              ? "—"
              : report.averageQuotationTurnaroundHours.toFixed(1),
          ],
          ["Confirmed / delivered bookings", report.confirmedBookings],
          ["Overdue follow-ups", report.overdueFollowups],
          [
            "Acceptance rate",
            report.acceptanceRate === null
              ? "—"
              : `${(report.acceptanceRate * 100).toFixed(1)}%`,
          ],
          [
            "Booking conversion",
            report.bookingConversion === null
              ? "—"
              : `${(report.bookingConversion * 100).toFixed(1)}%`,
          ],
        ].map(([label, value]) => (
          <article key={label}>
            <small>{w(String(label))}</small>
            <strong>{typeof value === "string" ? w(value) : value}</strong>
          </article>
        ))}
      </div>
      <div className="platform-two-col">
        <section className="platform-panel">
          <h2>
            <WorkspaceText text="Demand by division" />
          </h2>
          {Object.entries(report.byDivision).map(([division, count]) => (
            <div className="report-bar" key={division}>
              <span>{w(division)}</span>
              <strong>{count}</strong>
              <div
                style={{
                  width: `${report.inquiries ? (count / report.inquiries) * 100 : 0}%`,
                }}
              />
            </div>
          ))}
        </section>
        <section className="platform-panel">
          <h2>
            <WorkspaceText text="Keep financial measures distinct." />
          </h2>
          <dl className="platform-description-list">
            <div>
              <dt>
                <WorkspaceText text="Current quoted value" />
              </dt>
              <dd>{money(report.quotedMinor)}</dd>
            </div>
            <div>
              <dt>
                <WorkspaceText text="Confirmed / delivered booking value" />
              </dt>
              <dd>{money(report.confirmedBookingMinor)}</dd>
            </div>
            <div>
              <dt>
                <WorkspaceText text="Invoiced value" />
              </dt>
              <dd>
                <WorkspaceText text="Not connected" />
              </dd>
            </div>
            <div>
              <dt>
                <WorkspaceText text="Collected revenue" />
              </dt>
              <dd>
                <WorkspaceText text="Not connected" />
              </dd>
            </div>
          </dl>
          <Notice>{report.notice}</Notice>
          <p>
            <WorkspaceText text=" Acceptance denominator: all issued versions visible in this report. Booking conversion denominator: all valid inquiries in scope. Division counts can overlap for multi-service enquiries. These are operational counts, not marketing attribution or audited accounts. " />
          </p>
        </section>
      </div>
    </>
  );
}
export function SettingsWorkspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy();
  const [jobs, setJobs] = useState<unknown>(),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [reason, setReason] = useState("");
  return (
    <div className="platform-card-stack">
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Integration readiness" />
        </h2>
        <dl className="platform-description-list">
          {Object.entries(data.settings || {}).map(([key, value]) => (
            <div key={key}>
              <dt>{w(key)}</dt>
              <dd>
                {typeof value === "boolean"
                  ? value
                    ? w("Enabled / configured")
                    : w("Not enabled / configured")
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>
        <Notice>
          <WorkspaceText text=" Configuration flags are not proof of successful delivery, malware scanning, legal compliance or production readiness. Secrets are supplied through the server environment, never through CMS text fields. Preview mode never sends notification emails. " />
        </Notice>
        <ActionForm
          label="Process due publishing, email and scan jobs"
          onSubmit={async () => {
            setJobs(await platformApi("admin/jobs", {}));
            await refresh();
          }}
        />
        {jobs !== undefined && <pre>{JSON.stringify(jobs, null, 2)}</pre>}
        <p>
          <WorkspaceText text=" Production requires a scheduled worker, a persistent data volume, monitoring and tested backups. The public health endpoint is" />{" "}
          <code>
            <WorkspaceText text="/api/platform/health" />
          </code>
          <WorkspaceText text=". Detailed customer records are never included in it. " />
        </p>
      </section>
      <OperationsSettings
        key={data.operationSettings?.version}
        data={data}
        refresh={refresh}
      />
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Worker heartbeat & notification delivery" />
        </h2>
        <p>
          <WorkspaceText text="A configured scheduler is required for acknowledgements, reminders, retries and scanning. These are actual retained worker runs and delivery states, not a guarantee of mailbox receipt." />
        </p>
        {data.workerRuns?.length ? (
          data.workerRuns.map((run) => (
            <details key={run.id}>
              <summary>
                {readableDate(run.started_at)} <WorkspaceText text="·" />{" "}
                {run.state}
              </summary>
              <pre>
                {run.summary || w("Worker has not reported completion.")}
              </pre>
            </details>
          ))
        ) : (
          <Notice error>
            <WorkspaceText text="No scheduled worker run is recorded yet. Configure the timer in infrastructure/ before production launch." />
          </Notice>
        )}
        <div className="platform-table-wrap">
          <table className="platform-table">
            <caption>
              <WorkspaceText text="Recent notification attempts" />
            </caption>
            <thead>
              <tr>
                <th>
                  <WorkspaceText text="Event" />
                </th>
                <th>
                  <WorkspaceText text="State" />
                </th>
                <th>
                  <WorkspaceText text="Attempts" />
                </th>
                <th>
                  <WorkspaceText text="Recorded" />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.notifications?.map((row) => (
                <tr key={row.id}>
                  <td>{row.dedup_key.split(":")[0]}</td>
                  <td>
                    <Badge value={row.state} />
                  </td>
                  <td>{row.attempts}</td>
                  <td>{readableDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <PrivacyPanel data={data} management refresh={refresh} />
      {data.capabilities?.["content.publish"] && (
        <section className="platform-panel">
          <h2>
            <WorkspaceText text="Managed public redirects" />
          </h2>
          <ActionForm
            label="Save permanent redirect"
            onSubmit={async () => {
              await platformApi("admin/redirects", { from, to, reason });
              setFrom("");
              setTo("");
            }}
          >
            <FormField label="Old public path">
              <input
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="/projects/old-case-study"
                required
              />
            </FormField>
            <FormField label="Published destination">
              <input
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="/projects/current-case-study"
                required
              />
            </FormField>
            <FormField label="Reason">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                required
              />
            </FormField>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
export { AuditWorkspace } from "./platform-audit-ui";
export function AiWorkspace({ data }: { data: WorkspaceData }) {
  const w = useWorkspaceCopy();
  const [module, setModule] = useState("chat"),
    [text, setText] = useState(""),
    [language, setLanguage] = useState("en"),
    [inquiryId, setInquiryId] = useState(""),
    [result, setResult] = useState<Record<string, unknown> | null>(null);
  const modules = [
    "chat",
    "recommend",
    "inquiry-draft",
    "quotation-draft",
    "content-draft",
    "translate",
    "classify",
    "analytics",
    "portfolio",
  ];
  return (
    <div className="platform-two-col">
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Assistance, not authority." />
        </h2>
        <Notice>
          <WorkspaceText text=" One governed gateway supports the eight blueprint capabilities. Without an approved provider, published-source guidance and verified reports remain available. Generative drafting stays disabled. No assistant can publish, set prices, approve discounts, access unrelated records or confirm a booking. " />
        </Notice>
        <ActionForm
          label="Prepare a reviewed suggestion"
          onSubmit={async () =>
            setResult(
              await platformApi("assistant", {
                module,
                text,
                language,
                inquiryId: inquiryId || undefined,
              }),
            )
          }
        >
          <FormField label="Capability">
            <select
              value={module}
              onChange={(event) => setModule(event.target.value)}
            >
              {modules.map((value) => (
                <option key={value} value={value}>
                  {w(value)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Response language">
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">
                <WorkspaceText text="English" />
              </option>
              <option value="sw">
                <WorkspaceText text="Kiswahili" />
              </option>
            </select>
          </FormField>
          {["classify", "quotation-draft"].includes(module) && (
            <FormField label="Authorized inquiry">
              <select
                value={inquiryId}
                onChange={(event) => setInquiryId(event.target.value)}
                required
              >
                <option value="">
                  <WorkspaceText text="Choose inquiry" />
                </option>
                {data.inquiries.map((inquiry) => (
                  <option key={inquiry.id} value={inquiry.id}>
                    {inquiry.reference}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField
            label="Question / drafting brief"
            hint="No passwords, private keys, customer health records or confidential production data. Original customer messages are never overwritten by a translation."
          >
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              minLength={2}
              maxLength={1500}
              rows={5}
              required
            />
          </FormField>
        </ActionForm>
      </section>
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Review the result" />
        </h2>
        {result ? (
          <>
            <Badge value={String(result.mode)} />
            {typeof result.answer === "string" && (
              <p className="assistant-text">{result.answer}</p>
            )}
            {typeof result.scope === "string" && (
              <div className="quotation-terms">{result.scope}</div>
            )}
            {typeof result.draft === "string" && (
              <div className="quotation-terms">{result.draft}</div>
            )}
            <details>
              <summary>
                <WorkspaceText text="Structured suggestion & source record" />
              </summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
            <Notice>
              <WorkspaceText text=" This result is not a published fact, commercial approval, submitted request or booking. A responsible person must review it before taking action. " />
            </Notice>
          </>
        ) : (
          <EmptyState title="No assistant result yet.">
            <WorkspaceText text=" AI outputs cannot bypass the normal content, permissions, pricing or quotation workflows. " />
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function OperationsSettings({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const [days, setDays] = useState(
      data.operationSettings?.quotationReminderDays || 3,
    ),
    [hours, setHours] = useState(
      data.operationSettings?.followupReminderHours || 24,
    ),
    [customers, setCustomers] = useState(
      !!data.operationSettings?.customerExpiryReminders,
    ),
    [reason, setReason] = useState("");
  return (
    <section className="platform-panel">
      <h2>
        <WorkspaceText text="Governed reminder thresholds" />
      </h2>
      <ActionForm
        label="Save reminder policy"
        onSubmit={async () => {
          await platformApi("admin/settings/operations", {
            settings: {
              quotationReminderDays: days,
              followupReminderHours: hours,
              customerExpiryReminders: customers,
            },
            expectedVersion: data.operationSettings?.version || 1,
            reason,
          });
          await refresh();
        }}
      >
        <div className="platform-two-col">
          <FormField label="Quotation expiry warning · days">
            <input
              type="number"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              min={1}
              max={30}
              required
            />
          </FormField>
          <FormField label="Follow-up warning · hours">
            <input
              type="number"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              min={1}
              max={168}
              required
            />
          </FormField>
        </div>
        <label className="platform-check">
          <input
            type="checkbox"
            checked={customers}
            onChange={(event) => setCustomers(event.target.checked)}
          />
          <WorkspaceText text="Permit a one-time customer reminder near an issued offer's expiry" />
        </label>
        <FormField label="Approved policy / reason">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={2000}
            required
          />
        </FormField>
      </ActionForm>
    </section>
  );
}
