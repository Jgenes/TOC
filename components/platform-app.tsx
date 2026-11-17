"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  History,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { L } from "@/lib/content";
import { Logo, useSite } from "./site-shell";
import { AccountEntry } from "./platform-account";
import { PrivacyPanel } from "./platform-privacy";
import { SuppliersWorkspace } from "./platform-suppliers";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  readableDate,
} from "./platform-shared";
import { InquiryWorkspace } from "./platform-inquiries";
import { QuotationsWorkspace } from "./platform-quotations";
import { ContentStudio } from "./platform-cms-ui";
import {
  OperationsWorkspace,
  ResourcesWorkspace,
} from "./platform-operations-ui";
import {
  AiWorkspace,
  AuditWorkspace,
  PricingWorkspace,
  ReportsWorkspace,
  SettingsWorkspace,
  UsersWorkspace,
} from "./platform-management";
import type { Principal, WorkspaceData } from "./platform-types";

const sections = [
  { id: "dashboard", label: L("Overview", "Muhtasari"), icon: LayoutDashboard },
  {
    id: "requests",
    label: L("Inquiries & follow-ups", "Maombi na ufuatiliaji"),
    icon: ClipboardList,
    permission: "inquiry.read",
  },
  {
    id: "content",
    label: L("Content studio", "Maudhui"),
    icon: FileText,
    permission: "content.edit",
  },
  {
    id: "quotations",
    label: L("Quotations", "Bei rasmi"),
    icon: WalletCards,
    permission: "quotation.read",
  },
  {
    id: "bookings",
    label: L("Bookings", "Nafasi"),
    icon: CalendarDays,
    permission: "inquiry.read",
  },
  {
    id: "projects",
    label: L("Delivery projects", "Miradi ya huduma"),
    icon: Layers3,
    permission: "inquiry.read",
  },
  {
    id: "visits",
    label: L("Cleaning schedules", "Ratiba za usafi"),
    icon: ShieldCheck,
    permission: "booking.manage",
  },
  {
    id: "documents",
    label: L("Documents", "Nyaraka"),
    icon: FolderOpen,
    permission: "inquiry.read",
  },
  {
    id: "messages",
    label: L("Messages", "Ujumbe"),
    icon: MessageSquare,
    permission: "inquiry.read",
  },
  {
    id: "resources",
    label: L("Resource register", "Rejesta ya rasilimali"),
    icon: Gauge,
    permission: "resource.manage",
  },
  {
    id: "suppliers",
    label: L("Supplier register", "Rejesta ya wasambazaji"),
    icon: Users,
    permission: "supplier.read",
  },
  {
    id: "pricing",
    label: L("Price books", "Vitabu vya bei"),
    icon: WalletCards,
    permission: "pricing.edit",
  },
  {
    id: "users",
    label: L("People & permissions", "Watu na ruhusa"),
    icon: Users,
    permission: "users.manage",
  },
  {
    id: "reports",
    label: L("Reports", "Ripoti"),
    icon: BarChart3,
    permission: "reports.read",
  },
  {
    id: "assistant",
    label: L("Assistance & knowledge", "Msaada na maarifa"),
    icon: Sparkles,
  },
  {
    id: "audit",
    label: L("Audit evidence", "Ushahidi wa ukaguzi"),
    icon: History,
    permission: "audit.read",
  },
  {
    id: "settings",
    label: L("Settings & integrations", "Mipangilio"),
    icon: Settings,
    permission: "settings.manage",
  },
  {
    id: "profile",
    label: L("Profile & security", "Wasifu na usalama"),
    icon: ShieldCheck,
  },
];
const customerSections = new Set([
  "dashboard",
  "requests",
  "quotations",
  "bookings",
  "projects",
  "documents",
  "messages",
  "profile",
]);
export function PlatformApp({
  staff = false,
  initialScreen = "",
}: {
  staff?: boolean;
  initialScreen?: string;
}) {
  const w = useWorkspaceCopy();
  const router = useRouter();
  const { t, language, setLanguage } = useSite(),
    [data, setData] = useState<WorkspaceData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [configured, setConfigured] = useState(true),
    [section, setSection] = useState(initialScreen || "dashboard"),
    [mobileNav, setMobileNav] = useState(false);
  const refresh = async () => {
    const result = await platformApi<WorkspaceData>(
      staff ? "workspace" : "portal",
    );
    setData(result);
    setError("");
  };
  const load = async () => {
    setLoading(true);
    try {
      const session = await platformApi<{
        user: Principal | null;
        accountsConfigured: boolean;
      }>("auth/session");
      setConfigured(session.accountsConfigured);
      if (session.user) {
        if (staff && !session.user.roles.some((role) => role !== "customer")) {
          setError(
            "Your account is a customer account. Open the customer portal, or ask an authorized administrator to review staff access.",
          );
          setData(null);
        } else await refresh();
      } else setData(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load the workspace.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setSection(initialScreen || "dashboard");
    setMobileNav(false);
  }, [initialScreen]);
  useEffect(() => {
    if (!mobileNav) return;
    document
      .querySelector<HTMLElement>(".platform-sidebar nav button")
      ?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNav(false);
        document
          .querySelector<HTMLElement>(".workspace-mobile-toggle")
          ?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [mobileNav]);
  if (
    ["register", "verify", "forgot", "reset", "claim"].includes(initialScreen)
  )
    return <AccountEntry screen={initialScreen} staff={staff} />;
  if (loading)
    return (
      <div className="platform-loading">
        <LoaderCircle size={28} className="spin" />
        <p>
          {t(
            L(
              "Opening your protected workspace…",
              "Tunafungua eneo lako lililolindwa…",
            ),
          )}
        </p>
      </div>
    );
  if (!data)
    return (
      <>
        {error && (
          <div className="platform-login-notice">
            <Notice error>{error}</Notice>
            <Link href="/portal">
              <WorkspaceText text="Customer portal →" />
            </Link>
          </div>
        )}
        {staff && !configured && (
          <div className="platform-login-notice">
            <Notice>
              <WorkspaceText text=" No staff accounts are configured yet. The deployment operator must run " />
              <code>
                <WorkspaceText text="npm run setup:accounts" />
              </code>{" "}
              <WorkspaceText text=" privately, then register an authenticator. This page never accepts a shared administrative password. " />
            </Notice>
          </div>
        )}
        <AccountEntry
          staff={staff}
          onSignedIn={() => {
            setSection("dashboard");
            void load();
          }}
        />
      </>
    );
  const nav = sections.filter((item) =>
      staff
        ? !item.permission || data.capabilities?.[item.permission]
        : customerSections.has(item.id),
    ),
    active = nav.find((item) => item.id === section) || nav[0],
    current = active.id;
  const choose = (id: string) => {
    setSection(id);
    router.push(`/${staff ? "admin" : "portal"}/${id}`);
    setMobileNav(false);
    document.getElementById("workspace-heading")?.focus();
  };
  const logout = async () => {
    try {
      await platformApi("auth/logout", {});
      setData(null);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign out.");
    }
  };
  return (
    <div className="platform-shell">
      <aside className={`platform-sidebar${mobileNav ? " is-open" : ""}`}>
        {mobileNav && (
          <button
            type="button"
            className="workspace-close-navigation"
            onClick={() => {
              setMobileNav(false);
              document
                .querySelector<HTMLElement>(".workspace-mobile-toggle")
                ?.focus();
            }}
          >
            {t(L("Close navigation", "Funga menyu"))} <WorkspaceText text="×" />
          </button>
        )}
        <Link
          href="/"
          className="workspace-logo"
          aria-label={w("TOC homepage")}
        >
          <Logo light />
        </Link>
        <div className="workspace-identity">
          <span className="platform-kicker">
            {t(
              staff
                ? L("STAFF WORKSPACE", "ENEO LA WAFANYAKAZI")
                : L("CUSTOMER PORTAL", "MLANGO WA MTEJA"),
            )}
          </span>
          <strong>{data.user.name}</strong>
          <small>
            {staff
              ? data.user.roles
                  .map((role) => w(role.replaceAll("_", " ")))
                  .join(" · ")
              : data.user.email}
          </small>
        </div>
        <nav aria-label={w(staff ? "Staff workspace" : "Customer portal")}>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={current === item.id ? "active" : ""}
                onClick={() => choose(item.id)}
                aria-current={current === item.id ? "page" : undefined}
              >
                <Icon size={18} />
                <span>
                  {t(
                    !staff && item.id === "requests"
                      ? L("My requests", "Maombi yangu")
                      : item.label,
                  )}
                </span>
                {item.id === "requests" && data.inquiries.length > 0 && (
                  <small>{data.inquiries.length}</small>
                )}
              </button>
            );
          })}
        </nav>
        <div className="workspace-sidebar-bottom">
          <Link href="/">
            {t(L("Public website", "Tovuti ya umma"))}{" "}
            <WorkspaceText text="↗" />
          </Link>
          <button onClick={logout}>
            <LogOut size={17} />
            {t(L("Sign out", "Ondoka"))}
          </button>
        </div>
      </aside>
      <div className="platform-main">
        <header className="workspace-topbar">
          <button
            className="workspace-mobile-toggle platform-small-button"
            onClick={() => setMobileNav(!mobileNav)}
            aria-expanded={mobileNav}
            aria-label={w("Toggle workspace navigation")}
          >
            <WorkspaceText text=" ☰ Menu " />
          </button>
          <span>
            {t(
              L(
                "TOC · One connected platform",
                "TOC · Mfumo mmoja uliounganishwa",
              ),
            )}
          </span>
          <div>
            <button
              className="platform-small-button"
              onClick={() => setLanguage(language === "en" ? "sw" : "en")}
            >
              {language === "en" ? w("SW") : w("EN")}
            </button>
            <button
              className="platform-small-button"
              onClick={async () => {
                try {
                  await refresh();
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not refresh. Sign in again if your session expired.",
                  );
                }
              }}
            >
              <RefreshCw size={16} />
              <span>{t(L("Refresh", "Onyesha upya"))}</span>
            </button>
            <button
              className="workspace-avatar"
              onClick={() => choose("profile")}
              aria-label={w("Open profile")}
            >
              {data.user.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <div className="workspace-content">
          <div className="workspace-page-heading">
            <div>
              <p className="platform-kicker">
                {t(
                  staff
                    ? L("THE DETAILS, UNDER CONTROL", "MAELEZO YANADHIBITIWA")
                    : L("A LITTLE MORE CLARITY", "UFAHAMU ZAIDI"),
                )}
              </p>
              <h1 id="workspace-heading" tabIndex={-1}>
                {t(active.label)}
              </h1>
            </div>
            <span className="workspace-date">
              {readableDate(new Date().toISOString())}{" "}
              <WorkspaceText text="EAT" />
            </span>
          </div>
          {data.preview && (
            <Notice>
              {t(
                L(
                  "Preview workspace. Use synthetic details only. Notifications are stored locally, never sent; unscanned uploads stay quarantined.",
                  "Eneo la hakikisho. Tumia taarifa za majaribio tu. Arifa huhifadhiwa hapa, hazitumwi; faili zisizochunguzwa huzuiliwa.",
                ),
              )}
            </Notice>
          )}
          {error && <Notice error>{error}</Notice>}
          {current === "dashboard" && (
            <Overview data={data} staff={staff} choose={choose} />
          )}
          {["requests", "messages", "documents"].includes(current) && (
            <InquiryWorkspace
              data={data}
              staff={staff}
              refresh={refresh}
              focus={
                current === "requests"
                  ? "requests"
                  : (current as "messages" | "documents")
              }
            />
          )}
          {current === "content" && (
            <ContentStudio data={data} refresh={refresh} />
          )}
          {current === "quotations" && (
            <QuotationsWorkspace data={data} staff={staff} refresh={refresh} />
          )}
          {["bookings", "projects", "visits"].includes(current) && (
            <OperationsWorkspace
              data={data}
              staff={staff}
              refresh={refresh}
              view={current as "bookings" | "projects" | "visits"}
            />
          )}
          {current === "resources" && (
            <ResourcesWorkspace data={data} refresh={refresh} />
          )}
          {current === "suppliers" && (
            <SuppliersWorkspace data={data} refresh={refresh} />
          )}
          {current === "pricing" && (
            <PricingWorkspace data={data} refresh={refresh} />
          )}
          {current === "users" && (
            <UsersWorkspace data={data} refresh={refresh} />
          )}
          {current === "reports" && <ReportsWorkspace data={data} />}
          {current === "audit" && <AuditWorkspace data={data} />}
          {current === "settings" && (
            <SettingsWorkspace data={data} refresh={refresh} />
          )}
          {current === "assistant" && <AiWorkspace data={data} />}
          {current === "profile" && (
            <ProfileWorkspace
              key={data.user.name}
              data={data}
              refresh={refresh}
              logout={logout}
            />
          )}
        </div>
        <footer className="workspace-footer">
          <span>
            <WorkspaceText text="TOC Investment Company Limited" />
          </span>
          <Link href="/privacy">
            {t(L("Privacy & data handling", "Faragha na utunzaji wa data"))}
          </Link>
        </footer>
      </div>
    </div>
  );
}
function Overview({
  data,
  staff,
  choose,
}: {
  data: WorkspaceData;
  staff: boolean;
  choose: (id: string) => void;
}) {
  const w = useWorkspaceCopy();
  const { t } = useSite();
  const metrics = [
    [
      L("Inquiries in scope", "Maombi kwenye wigo"),
      data.inquiries.length,
      "requests",
    ],
    [
      L("Quotations to review", "Bei za kupitia"),
      data.quotations.filter((quote) =>
        staff ? quote.status === "pending_approval" : quote.status === "issued",
      ).length,
      "quotations",
    ],
    [
      L("Confirmed services", "Huduma zilizothibitishwa"),
      data.bookings.filter((booking) =>
        ["confirmed", "in_progress"].includes(booking.status),
      ).length,
      "bookings",
    ],
    [
      L("Delivery projects", "Miradi ya huduma"),
      data.projects.length,
      "projects",
    ],
  ] as const;
  return (
    <>
      <div className="workspace-welcome">
        <div>
          <span className="platform-kicker">
            {t(
              L(
                "GOOD SERVICE STARTS WITH CLARITY",
                "HUDUMA BORA HUANZA KWA UWAZI",
              ),
            )}
          </span>
          <h2>
            {t(L("A place for the next step.", "Mahali pa hatua inayofuata."))}
          </h2>
          <p>
            {staff
              ? w(
                  "Your role determines which records and decisions appear here. No dashboard example is presented as real company performance.",
                )
              : t(
                  L(
                    "Keep track of what you have requested, what needs your review and what TOC has formally confirmed.",
                    "Fuatilia maombi, yanayohitaji mapitio yako na yaliyothibitishwa rasmi na TOC.",
                  ),
                )}
          </p>
        </div>
        <ShieldCheck size={72} strokeWidth={0.9} />
      </div>
      <div className="platform-metrics">
        {metrics.map(([label, count, id]) => (
          <button key={id} onClick={() => choose(id)}>
            <small>{t(label)}</small>
            <strong>{count}</strong>
            <span>
              {t(L("Open records", "Fungua rekodi"))} <WorkspaceText text="↗" />
            </span>
          </button>
        ))}
      </div>
      <div className="platform-two-col">
        <section className="platform-panel">
          <h2>{t(L("Your latest requests", "Maombi yako ya karibuni"))}</h2>
          {data.inquiries.length ? (
            <div className="overview-requests">
              {data.inquiries.slice(0, 5).map((inquiry) => (
                <button key={inquiry.id} onClick={() => choose("requests")}>
                  <div>
                    <strong>{inquiry.reference}</strong>
                    <small>
                      {inquiry.service.replaceAll("-", " ")}{" "}
                      <WorkspaceText text="·" /> {inquiry.location}
                    </small>
                  </div>
                  <Badge value={inquiry.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t(L("A fresh workspace.", "Eneo jipya la kazi."))}
            >
              {t(
                L(
                  "Your authorized records will appear here. Existing inquiries need a one-time claim link sent to their original email address.",
                  "Rekodi zako zilizoidhinishwa zitaonekana hapa. Maombi yaliyopo yanahitaji kiungo cha mara moja kinachotumwa kwenye barua pepe ya awali.",
                ),
              )}
            </EmptyState>
          )}
          {!staff && (
            <Link className="platform-small-button" href="/request-quotation">
              {t(L("Start a new inquiry", "Anza ombi jipya"))}{" "}
              <WorkspaceText text="↗" />
            </Link>
          )}
        </section>
        <section className="platform-panel">
          <h2>{t(L("What happens next?", "Nini kinafuata?"))}</h2>
          <ol className="next-step-list">
            <li>
              <span>
                <WorkspaceText text="01" />
              </span>
              <div>
                <strong>
                  <WorkspaceText text="Requirements are reviewed" />
                </strong>
                <p>
                  <WorkspaceText text=" The relevant department checks scope, dates and practical details. " />
                </p>
              </div>
            </li>
            <li>
              <span>
                <WorkspaceText text="02" />
              </span>
              <div>
                <strong>
                  <WorkspaceText text="An authorized offer is issued" />
                </strong>
                <p>
                  <WorkspaceText text=" Prices, taxes, validity and terms are preserved for each version. " />
                </p>
              </div>
            </li>
            <li>
              <span>
                <WorkspaceText text="03" />
              </span>
              <div>
                <strong>
                  <WorkspaceText text="Operations confirm the booking" />
                </strong>
                <p>
                  <WorkspaceText text="Acceptance alone does not reserve staff or equipment." />
                </p>
              </div>
            </li>
            <li>
              <span>
                <WorkspaceText text="04" />
              </span>
              <div>
                <strong>
                  <WorkspaceText text="Delivery stays visible" />
                </strong>
                <p>
                  <WorkspaceText text=" Milestones, quality records, messages and documents stay together. " />
                </p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
function ProfileWorkspace({
  data,
  refresh,
  logout,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}) {
  const [name, setName] = useState(data.user.name),
    [organization, setOrganization] = useState(data.profile.organization || ""),
    [phone, setPhone] = useState(data.profile.phone || ""),
    [address, setAddress] = useState(data.profile.address || ""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <div className="platform-two-col">
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Profile & organization" />
        </h2>
        <p>
          <WorkspaceText text=" Verified email: " />
          <strong>{data.user.email}</strong>
          <WorkspaceText text=". An organization name is a contact detail, not automatic permission to another representative's records. " />
        </p>
        {saved && (
          <Notice>
            <WorkspaceText text=" Profile saved. Existing issued quotations retain their original customer snapshot. " />
          </Notice>
        )}
        <ActionForm
          label="Save profile"
          onSubmit={async () => {
            await platformApi("auth/profile", {
              name,
              organization,
              phone,
              address,
            });
            setSaved(true);
            await refresh();
          }}
        >
          <FormField label="Full name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </FormField>
          <FormField label="Organization">
            <input
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              maxLength={150}
            />
          </FormField>
          <FormField label="Telephone">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
            />
          </FormField>
          <FormField label="Address">
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={250}
            />
          </FormField>
        </ActionForm>
      </section>
      <section className="platform-panel">
        <h2>
          <WorkspaceText text="Account security" />
        </h2>
        <p>
          <WorkspaceText text=" Sessions expire after eight hours and are revoked after a password or access change. Staff sessions require authenticator verification. " />
        </p>
        <ActionForm
          label="Change password & revoke sessions"
          onSubmit={async () => {
            await platformApi("auth/password", { current, password });
            setCurrent("");
            setPassword("");
            await logout();
          }}
        >
          <FormField label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              required
            />
          </FormField>
          <FormField label="New password (at least 12 characters)">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              maxLength={128}
              required
            />
          </FormField>
        </ActionForm>
        <PrivacyPanel data={data} refresh={refresh} />
      </section>
    </div>
  );
}
