"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { isPreview, services } from "@/lib/content";
import {
  nextStatuses,
  type InquiryStatus,
  type StoredInquiry,
} from "@/lib/inquiry";
import { Logo } from "./site-shell";

const labels: Record<InquiryStatus, string> = {
  new: "New",
  in_review: "In review",
  contacted: "Contacted",
  closed: "Closed",
};
const date = (s: string) =>
  new Intl.DateTimeFormat("en-TZ", {
    timeZone: "Africa/Dar_es_Salaam",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
const serviceName = (s: string) =>
  services.find((v) => v.slug === s)?.title.en ||
  (s === "contact" ? "General inquiry" : "Service guidance");
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function StaffInbox() {
  const [mode, setMode] = useState<"loading" | "login" | "inbox">("loading");
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState<StoredInquiry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<StoredInquiry | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const refresh = async () => {
    try {
      const res = await fetch("/api/staff/inquiries", { cache: "no-store" });
      const body = await res.json();
      if (res.status === 401) {
        setMode("login");
        setConfigured(body.configured !== false);
        return;
      }
      if (!res.ok) throw new Error("Could not load inquiries.");
      setRecords(body.inquiries);
      setMode("inbox");
    } catch {
      setError(
        "The inbox could not be loaded. Please check your connection and try again.",
      );
      setMode("login");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      previousFocus.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active === null]);
  const visible = useMemo(
    () =>
      records.filter(
        (r) =>
          (filter === "all" || r.status === filter) &&
          [
            r.reference,
            r.name,
            r.email,
            r.organization,
            r.location,
            serviceName(r.service),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [records, filter, search],
  );
  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error);
        return;
      }
      setPassword("");
      await refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      const res = await fetch("/api/staff/logout", { method: "POST" });
      if (!res.ok) throw new Error();
      setMode("login");
      setRecords([]);
      setActive(null);
      setError("");
    } catch {
      setError("Could not sign out. Please try again.");
    }
  };
  const changeStatus = async (status: InquiryStatus) => {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/inquiries/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (res.status === 401) {
        setActive(null);
        setMode("login");
        setError("Your session has expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        setError(body.error);
        return;
      }
      setActive(body.inquiry);
      setRecords((prev) =>
        prev.map((r) => (r.id === body.inquiry.id ? body.inquiry : r)),
      );
    } catch {
      setError("The status could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    const rows = [
      [
        "Reference",
        "Created (UTC)",
        "Status",
        "Service",
        "Name",
        "Organization",
        "Email",
        "Phone",
        "Location",
        "Preferred date",
        "Guests",
        "Message",
      ],
      ...visible.map((r) => [
        r.reference,
        r.createdAt,
        labels[r.status],
        serviceName(r.service),
        r.name,
        r.organization,
        r.email,
        r.phone,
        r.location,
        r.dateFlexible ? "To be confirmed" : r.eventDate,
        r.guestCount,
        r.message,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `TOC-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (mode === "loading")
    return (
      <div className="staff-loading">
        <LoaderCircle
          className="spin"
          size={28}
          aria-label="Loading staff access"
        />
      </div>
    );
  if (mode === "login")
    return (
      <section className="staff-login-page">
        <Link className="brand-link" href="/">
          <Logo />
        </Link>
        <div className="staff-login-card">
          <div className="eyebrow">
            <span />
            <LockKeyhole size={13} />
            AUTHORIZED STAFF ONLY
          </div>
          <h1>
            A little behind
            <br />
            the scenes.
          </h1>
          <p>
            Sign in to the TOC inquiry inbox. Customer information is private
            and must only be used to manage the relevant inquiry.
          </p>
          {!configured && (
            <div className="staff-notice">
              <strong>Staff access has not been configured.</strong>
              <br />
              The website operator can run <code>npm run setup:staff</code> and
              restart the server. There is no default password.
            </div>
          )}
          <form onSubmit={login}>
            <div className="field">
              <label htmlFor="staff-password">Staff password</label>
              <input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={256}
              />
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="button button-primary"
              disabled={busy || !password || !configured}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <LockKeyhole size={15} />
              )}
              Sign in securely
            </button>
          </form>
          <p className="staff-disclaimer">
            <ShieldCheck size={12} /> A protected local inquiry inbox, not a
            full enterprise CMS or customer portal.
          </p>
        </div>
        <Link href="/" className="text-link">
          <ArrowLeft size={14} />
          Back to the public website
        </Link>
      </section>
    );
  return (
    <div className="staff-app">
      <header className="staff-top">
        <div className="container">
          <Link href="/">
            <Logo light />
          </Link>
          <span>INQUIRIES & FOLLOW-UP</span>
          <button onClick={logout}>
            Sign out
            <LogOut size={15} />
          </button>
        </div>
      </header>
      <div className="container staff-main">
        <div className="staff-page-heading">
          <div>
            <div className="eyebrow">
              <span />
              TOC STAFF INBOX
            </div>
            <h1>A considered follow-up.</h1>
            <p>
              Real inquiries from this website. Clear ownership starts with a
              clear next step.
            </p>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button
              className="button button-outline"
              onClick={() => void refresh()}
              aria-label="Refresh inquiries"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              className="button button-dark"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="staff-stat-grid">
          {(["new", "in_review", "contacted", "closed"] as InquiryStatus[]).map(
            (status) => (
              <div key={status}>
                <span>{labels[status]}</span>
                <strong>
                  {String(
                    records.filter((r) => r.status === status).length,
                  ).padStart(2, "0")}
                </strong>
              </div>
            ),
          )}
        </div>
        {isPreview && (
          <div className="staff-notice">
            PREVIEW ENVIRONMENT · Submissions are stored on this server only. No
            automatic emails or WhatsApp messages are sent. Statuses track staff
            follow-up; they do not approve quotations, reserve dates or confirm
            bookings.
          </div>
        )}
        {error && !active && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="staff-toolbar">
          <div className="filter-tabs" aria-label="Filter inquiries by status">
            {["all", "new", "in_review", "contacted", "closed"].map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all"
                  ? "All inquiries"
                  : labels[value as InquiryStatus]}
              </button>
            ))}
          </div>
          <label className="staff-search">
            <Search size={15} />
            <span className="sr-only">Search inquiries</span>
            <input
              type="search"
              placeholder="Search name, reference or service…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="staff-table-wrap">
          {visible.length ? (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <button
                        onClick={() => {
                          setActive(record);
                          setError("");
                        }}
                      >
                        {record.reference}
                      </button>
                      <small>
                        {record.origin === "contact"
                          ? "Contact form"
                          : "Quotation request"}
                      </small>
                    </td>
                    <td>
                      <strong>{record.name}</strong>
                      <small>{record.organization || record.email}</small>
                    </td>
                    <td>{serviceName(record.service)}</td>
                    <td>{date(record.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${record.status}`}>
                        {labels[record.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setActive(record);
                          setError("");
                        }}
                        aria-label={`View inquiry ${record.reference}`}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="staff-empty">
              <Inbox size={39} strokeWidth={1} />
              <h2>
                {records.length
                  ? "Nothing matches just yet."
                  : "Ready for the first hello."}
              </h2>
              <p>
                {records.length
                  ? "Try another search or clear your status filter."
                  : "Website inquiries will appear here after a successful form submission."}
              </p>
              {!records.length && (
                <Link
                  className="button button-outline"
                  href="/request-quotation"
                >
                  Try the quotation journey
                  <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
          )}
        </div>
        <p className="staff-workflow-note">
          Showing up to the latest 1,000 inquiries. Handle exported customer
          data carefully. All status changes are recorded in the local audit
          log.
        </p>
      </div>
      {active && (
        <div
          className="staff-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-reference"
            className="staff-detail"
            ref={detailRef}
            onKeyDown={(e) => {
              if (e.key === "Escape") setActive(null);
              if (e.key === "Tab") {
                const els = detailRef.current?.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), a[href]",
                );
                if (els?.length) {
                  const first = els[0],
                    last = els[els.length - 1];
                  if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                  }
                }
              }
            }}
          >
            <div className="staff-detail-heading">
              <div>
                <small>INQUIRY DETAILS · {date(active.createdAt)}</small>
                <h2 id="inquiry-reference">{active.reference}</h2>
              </div>
              <button
                ref={closeRef}
                aria-label="Close inquiry details"
                onClick={() => setActive(null)}
              >
                <X size={22} />
              </button>
            </div>
            <span className={`status-badge status-${active.status}`}>
              {labels[active.status]}
            </span>
            <div className="staff-status-actions">
              {nextStatuses(active.status).map((status) => (
                <button
                  key={status}
                  disabled={busy}
                  className={`button ${status === "closed" ? "button-outline" : "button-primary"}`}
                  onClick={() => void changeStatus(status)}
                >
                  {busy ? (
                    <LoaderCircle size={13} className="spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  Mark {labels[status].toLowerCase()}
                </button>
              ))}
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <p className="staff-workflow-note">
              New inquiries must be reviewed before progressing. Closing an
              inquiry does not confirm a service or booking.
            </p>
            <div className="staff-detail-section" style={{ marginTop: 23 }}>
              <h3>The customer</h3>
              <p>
                <strong>{active.name}</strong>
                {active.organization && ` · ${active.organization}`}
              </p>
              <a
                href={`mailto:${active.email}?subject=${encodeURIComponent(`Your TOC inquiry ${active.reference}`)}`}
              >
                {active.email}
              </a>
              {active.phone && (
                <a href={`tel:${active.phone.replace(/[^+\d]/g, "")}`}>
                  {active.phone}
                </a>
              )}
            </div>
            <div className="staff-detail-section">
              <h3>The occasion</h3>
              <dl>
                {[
                  ["Service", serviceName(active.service)],
                  ["Occasion", active.eventType || "Not specified"],
                  ["Location", active.location || "Not specified"],
                  [
                    "Preferred date",
                    active.dateFlexible ? "To be confirmed" : active.eventDate,
                  ],
                  ["Guest count", active.guestCount || "To be discussed"],
                  ["Serving style", active.serviceStyle || "Not specified"],
                  ["Budget guidance", active.budget || "To be discussed"],
                ].map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {!!active.preferences.length && (
              <div className="staff-detail-section">
                <h3>Requested considerations</h3>
                <p>{active.preferences.join("\n")}</p>
              </div>
            )}
            {active.dietary && (
              <div className="staff-detail-section">
                <h3>Dietary notes</h3>
                <p>{active.dietary}</p>
              </div>
            )}
            <div className="staff-detail-section">
              <h3>The message</h3>
              <p>{active.message || "No additional message supplied."}</p>
            </div>
            <div className="staff-detail-section">
              <h3>Record details</h3>
              <dl>
                <div>
                  <dt>Privacy consent</dt>
                  <dd>
                    {active.consent ? "Given at submission" : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>
                    {new Date(active.createdAt).toLocaleString("en-GB", {
                      timeZone: "Africa/Dar_es_Salaam",
                    })}{" "}
                    EAT
                  </dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>
                    {new Date(active.updatedAt).toLocaleString("en-GB", {
                      timeZone: "Africa/Dar_es_Salaam",
                    })}{" "}
                    EAT
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
