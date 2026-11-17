"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  Globe2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Monitor,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  company,
  isPreview,
  L,
  services,
  type Language,
  type Localized,
  type Service,
} from "@/lib/content";

export type PublicRecord = {
  id: string;
  type: string;
  slug: string;
  data: Record<string, unknown>;
  publishedAt: string;
};
export type SiteData = {
  catalog: Service[];
  profile: typeof company;
  content: PublicRecord[];
};
const defaultSite: SiteData = {
  catalog: services,
  profile: company,
  content: [],
};

const SiteContext = createContext<{
  catalog: Service[];
  profile: typeof company;
  content: PublicRecord[];
  language: Language;
  setLanguage: (l: Language) => void;
  t: (v: Localized) => string;
}>({ ...defaultSite, language: "en", setLanguage: () => {}, t: (v) => v.en });
export const useSite = () => useContext(SiteContext);
export function SiteProvider({
  children,
  initialData = defaultSite,
}: {
  children: ReactNode;
  initialData?: SiteData;
}) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("toc-language");
      if (saved === "sw") setLanguage("sw");
    } catch {
      /* Storage can be disabled; language switching still works for this page. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("toc-language", language);
    } catch {
      /* Optional preference only. */
    }
  }, [language]);
  return (
    <SiteContext.Provider
      value={{ ...initialData, language, setLanguage, t: (v) => v[language] }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  const color = light ? "#fff" : "#171717";
  return (
    <svg
      className="logo-svg"
      viewBox="0 0 258 57"
      role="img"
      aria-label="TOC Investment Company Limited — Touch of Class"
    >
      <path d="M4 11C24 2 50 0 81 1L59 7C37 8 20 14 4 22Z" fill={color} />
      <path d="M33 14 78 2 30 29 25 50 19 55 21 21Z" fill="#df1e2b" />
      <text
        x="30"
        y="49"
        fill={color}
        fontFamily="Manrope,Arial,sans-serif"
        fontWeight="800"
        fontSize="53"
        letterSpacing="-5"
      >
        OC
      </text>
      <path d="M109 13V49" stroke={color} strokeOpacity=".22" />
      <text
        x="121"
        y="27"
        fill={color}
        fontFamily="Manrope,Arial,sans-serif"
        fontWeight="800"
        fontSize="17"
        letterSpacing=".15"
      >
        INVESTMENT
      </text>
      <text
        x="121"
        y="43"
        fill={color}
        fontFamily="Manrope,Arial,sans-serif"
        fontWeight="700"
        fontSize="11.5"
        letterSpacing=".2"
      >
        COMPANY LIMITED
      </text>
    </svg>
  );
}

export const serviceIcons = {
  calendar: CalendarDays,
  utensils: UtensilsCrossed,
  audio: AudioLines,
  sparkles: Sparkles,
  monitor: Monitor,
};
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  arrow = true,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "white" | "dark" | "light";
  className?: string;
  arrow?: boolean;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {children}
      {arrow && <ArrowUpRight size={18} strokeWidth={1.8} />}
    </Link>
  );
}
export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className={`eyebrow${light ? " eyebrow-light" : ""}`}>
      <span />
      {children}
    </div>
  );
}
export function Breadcrumb({ current }: { current: string }) {
  const { t, catalog: services, profile: company } = useSite();
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <Link href="/">{t(L("Home", "Mwanzo"))}</Link>
      <ArrowRight size={12} />
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function Header() {
  const {
    t,
    language,
    setLanguage,
    catalog: services,
    profile: company,
    content,
  } = useSite();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open)
      document.querySelector<HTMLElement>("#mobile-navigation a")?.focus();
  }, [open]);
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setServicesOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.getElementById("mobile-navigation"))
          mobileTrigger.current?.focus();
        else if (
          document.activeElement &&
          dropdownRef.current?.contains(document.activeElement)
        )
          dropdownRef.current.querySelector("button")?.focus();
        setOpen(false);
        setServicesOpen(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  type NavItem = { href: string; label: Localized };
  const navigation = content.find(
    (item) => item.type === "navigation" && item.slug === "primary",
  )?.data as { items?: NavItem[]; footerItems?: NavItem[] } | undefined;
  const nav = navigation?.items || [
    { href: "/", label: L("Home", "Mwanzo") },
    { href: "/about", label: L("About TOC", "Kuhusu TOC") },
    { href: "/services", label: L("Our services", "Huduma zetu") },
    { href: "/projects", label: L("Projects", "Miradi") },
    { href: "/clients", label: L("Clients", "Wateja") },
    { href: "/news", label: L("News", "Habari") },
    { href: "/contact", label: L("Contact", "Mawasiliano") },
  ];
  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>
            {t(
              L(
                "A touch of class. In every detail.",
                "Mguso wa ubora. Katika kila hatua.",
              ),
            )}
          </span>
          <div>
            <span className="topbar-location">
              <MapPin size={12} />
              {company.location}
            </span>
            <a href={`tel:${company.phoneHref}`}>
              <Phone size={12} />
              {company.phone}
            </a>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand-link" aria-label="TOC homepage">
            <Logo />
          </Link>
          <nav
            aria-label={t(L("Main navigation", "Urambazaji mkuu"))}
            className="desktop-nav"
          >
            {nav.map((item) =>
              item.href === "/services" ? (
                <div
                  key={item.href}
                  className="nav-dropdown-wrap"
                  ref={dropdownRef}
                >
                  <button
                    className={`nav-link${pathname.startsWith("/services") ? " active" : ""}`}
                    onClick={() => setServicesOpen(!servicesOpen)}
                    aria-expanded={servicesOpen}
                    aria-controls="services-dropdown"
                  >
                    {t(item.label)}
                    <ChevronDown
                      size={13}
                      className={servicesOpen ? "rotate-180" : ""}
                    />
                  </button>
                  {servicesOpen && (
                    <div id="services-dropdown" className="services-dropdown">
                      <div className="dropdown-heading">
                        {t(
                          L(
                            "Thoughtfully coordinated. Beautifully delivered.",
                            "Uratibu makini. Utekelezaji mzuri.",
                          ),
                        )}
                      </div>
                      {services.map((service) => {
                        const Icon = serviceIcons[service.icon];
                        return (
                          <Link
                            key={service.slug}
                            href={`/services/${service.slug}`}
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="dropdown-icon">
                              <Icon size={20} />
                            </span>
                            <span>
                              <strong>{t(service.title)}</strong>
                              <small>{t(service.tags[0])}</small>
                            </span>
                            <ArrowUpRight size={17} />
                          </Link>
                        );
                      })}
                      <Link
                        className="all-services-link"
                        href="/services"
                        onClick={() => setServicesOpen(false)}
                      >
                        {t(L("Explore all services", "Tazama huduma zote"))}
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${active(item.href) ? " active" : ""}`}
                  aria-current={active(item.href) ? "page" : undefined}
                >
                  {t(item.label)}
                </Link>
              ),
            )}
          </nav>
          <div className="header-actions">
            <div className="language-switch" aria-label="Website language">
              <button
                className={language === "en" ? "selected" : ""}
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                lang="en"
              >
                EN
              </button>
              <span>/</span>
              <button
                className={language === "sw" ? "selected" : ""}
                onClick={() => setLanguage("sw")}
                aria-pressed={language === "sw"}
                lang="sw"
              >
                SW
              </button>
            </div>
            <ButtonLink href="/request-quotation" className="header-quote">
              {t(L("Request a quotation", "Omba bei"))}
            </ButtonLink>
            <button
              ref={mobileTrigger}
              className="mobile-menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={25} /> : <Menu size={25} />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            {[
              ...nav,
              ...services.map((s) => ({
                href: `/services/${s.slug}`,
                label: s.title,
              })),
              ...(
                navigation?.footerItems || [
                  { href: "/gallery", label: L("Gallery", "Picha") },
                  {
                    href: "/portal",
                    label: L("Customer portal", "Mlango wa mteja"),
                  },
                ]
              ).filter((item) => !nav.some((link) => link.href === item.href)),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={item.href.startsWith("/services/") ? "sub-link" : ""}
              >
                {t(item.label)}
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <ButtonLink href="/request-quotation">
              {t(L("Request a quotation", "Omba bei"))}
            </ButtonLink>
          </nav>
        )}
      </header>
    </>
  );
}

export function ClosingCTA() {
  const { t, catalog: services, profile: company } = useSite();
  return (
    <section className="closing-cta">
      <div className="container closing-cta-inner">
        <div>
          <p>
            {t(
              L(
                "YOUR NEXT GREAT OCCASION STARTS HERE",
                "TUKIO LAKO BORA LINAANZA HAPA",
              ),
            )}
          </p>
          <h2>
            {t(
              L(
                "Let’s make it\nsomething special.",
                "Tufanye liwe\ntukio la kipekee.",
              ),
            )}
          </h2>
        </div>
        <div className="closing-cta-action">
          <ButtonLink href="/request-quotation" variant="white">
            {t(L("Tell us what you have in mind", "Tueleze mawazo uliyonayo"))}
          </ButtonLink>
          <span>
            {t(
              L(
                "A conversation, not a commitment.",
                "Mazungumzo, si ahadi ya malipo.",
              ),
            )}
          </span>
        </div>
      </div>
      <div className="cta-watermark" aria-hidden="true">
        TOC
      </div>
    </section>
  );
}

export function Footer() {
  const { t, catalog: services, profile: company, content } = useSite();
  const footerLinks = (content.find(
    (item) => item.type === "navigation" && item.slug === "primary",
  )?.data.footerItems as { href: string; label: Localized }[] | undefined) || [
    {
      href: "/about",
      label: L("Our story & approach", "Hadithi na mbinu zetu"),
    },
    { href: "/gallery", label: L("Gallery", "Picha") },
    { href: "/projects", label: L("Projects", "Miradi") },
    { href: "/clients", label: L("Clients", "Wateja") },
    { href: "/news", label: L("News", "Habari") },
    { href: "/careers", label: L("Careers", "Ajira") },
    { href: "/downloads", label: L("Company documents", "Nyaraka za kampuni") },
    { href: "/portal", label: L("Customer portal", "Mlango wa mteja") },
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" aria-label="TOC homepage">
              <Logo light />
            </Link>
            <p>
              {t(
                L(
                  "Events, catering, cleaning, ICT and production. A touch of class, from start to finish.",
                  "Hafla, upishi, usafi, TEHAMA na uzalishaji. Mguso wa ubora, mwanzo hadi mwisho.",
                ),
              )}
            </p>
            <span className="footer-country">
              <span className="country-dot" />{" "}
              {t(
                L(
                  "Rooted in Tanzania. Made for your occasion.",
                  "Kutoka Tanzania. Kwa ajili ya tukio lako.",
                ),
              )}
            </span>
          </div>
          <div>
            <h3>{t(L("Our expertise", "Utaalamu wetu"))}</h3>
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                {t(s.title)}
              </Link>
            ))}
            <Link href="/quality-and-safety">
              {t(L("Quality & care", "Ubora na uangalizi"))}
            </Link>
          </div>
          <div>
            <h3>{t(L("Explore TOC", "Fahamu TOC"))}</h3>
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {t(item.label)}
              </Link>
            ))}
          </div>
          <div className="footer-contact">
            <h3>{t(L("Let’s talk", "Tuzungumze"))}</h3>
            <a href={`tel:${company.phoneHref}`}>
              <Phone size={15} />
              {company.phone}
            </a>
            <a href={`mailto:${company.email}`}>
              <Mail size={15} />
              <span>{company.email}</span>
            </a>
            <span>
              <MapPin size={15} />
              {company.location}
            </span>
            {company.whatsapp && (
              <a
                href={`https://wa.me/${company.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(
                  L("Contact TOC by WhatsApp", "Wasiliana na TOC kwa WhatsApp"),
                )}{" "}
                ↗
              </a>
            )}
            {company.social?.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label} ↗
              </a>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {company.name}.
          </p>
          <div>
            <Link href="/privacy">{t(L("Privacy", "Faragha"))}</Link>
            <Link href="/terms">{t(L("Terms of use", "Masharti"))}</Link>
            <Link href="/admin">{t(L("Staff access", "Wafanyakazi"))}</Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
            >
              <ArrowDown size={16} className="rotate-180" />
            </button>
          </div>
        </div>
        {isPreview && (
          <div className="preview-footer">
            {t(
              L(
                "Design preview · Photography is illustrative, not completed TOC projects. Company contacts require confirmation before launch.",
                "Hakikisho la muundo · Picha ni za mfano, si kazi zilizotekelezwa na TOC. Mawasiliano yanahitaji kuthibitishwa kabla ya uzinduzi.",
              ),
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

export function ServiceGuide() {
  const { t, language, catalog: services, profile: company } = useSite();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [assistantResult, setAssistantResult] = useState<{
    answer: string;
    aiUsed: boolean;
    sources?: { id: string; title: string; href: string }[];
  } | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  const questions = [
    {
      q: L("Which service do I need?", "Nahitaji huduma gani?"),
      a: L(
        "Planning an occasion? Start with Event management. Need meals, refreshments or a buffet? Choose Catering. For workplaces and facility care, choose Cleaning. For websites, networks or technical support, choose ICT. For sound, lighting or event media, choose Entertainment & production. You can combine requirements in one request.",
        "Unapanga tukio? Anza na Usimamizi wa hafla. Unahitaji chakula, viburudisho au bafe? Chagua Upishi. Kwa majengo, chagua Usafi. Kwa tovuti, mitandao au msaada wa kiufundi, chagua TEHAMA. Kwa sauti, mwanga au picha, chagua Burudani na uzalishaji. Unaweza kuchanganya mahitaji katika ombi moja.",
      ),
    },
    {
      q: L("How do I get a quotation?", "Ninapataje bei?"),
      a: L(
        "Use the quotation form to share your service, location, date and approximate guest count. No payment is taken and no date is reserved online. TOC must review the details and confirm a formal quotation.",
        "Tumia fomu kueleza huduma, eneo, tarehe na idadi ya wageni. Hakuna malipo wala kuhifadhi tarehe mtandaoni. TOC inahitaji kupitia maelezo na kuthibitisha bei rasmi.",
      ),
    },
    {
      q: L("Where is TOC based?", "TOC ipo wapi?"),
      a: L(
        "The supplied company profile lists Kisasa, Dodoma, Tanzania. Please contact the team to confirm office directions and service coverage for your location.",
        "Wasifu wa kampuni unaonesha Kisasa, Dodoma, Tanzania. Wasiliana na timu kuthibitisha maelekezo ya ofisi na maeneo yanayohudumiwa.",
      ),
    },
  ];
  const dismiss = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <div className="service-guide">
      {open && (
        <section
          className="guide-panel"
          role="dialog"
          aria-modal="false"
          aria-label={t(L("TOC service guide", "Mwongozo wa huduma za TOC"))}
          onKeyDown={(e) => {
            if (e.key === "Escape") dismiss();
          }}
        >
          <div className="guide-header">
            <span className="guide-avatar">
              <MessageCircle size={22} />
            </span>
            <div>
              <strong>
                {t(L("A little guidance?", "Unahitaji mwongozo?"))}
              </strong>
              <small>
                {t(
                  L(
                    "TOC service guide · Quick answers",
                    "Mwongozo wa TOC · Majibu ya haraka",
                  ),
                )}
              </small>
            </div>
            <button
              ref={closeRef}
              onClick={dismiss}
              aria-label="Close service guide"
            >
              <X size={19} />
            </button>
          </div>
          <div className="guide-content">
            <p>
              {t(
                L(
                  "Hello! Let’s point you in the right direction. What would you like to know?",
                  "Habari! Tukusaidie kupata unachohitaji. Ungependa kujua nini?",
                ),
              )}
            </p>
            <div className="guide-questions">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setAnswer(i)}
                  aria-pressed={answer === i}
                >
                  {t(q.q)}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
            {answer !== null && (
              <div className="guide-answer" aria-live="polite">
                {t(questions[answer].a)}
              </div>
            )}
            <form
              className="guide-question-input"
              onSubmit={async (event) => {
                event.preventDefault();
                if (assistantBusy) return;
                setAssistantBusy(true);
                setAssistantError("");
                try {
                  const response = await fetch("/api/platform/assistant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      module: "chat",
                      text: question,
                      language,
                    }),
                  });
                  const body = await response.json();
                  if (!response.ok)
                    throw new Error(body.error || "The guide is unavailable.");
                  setAssistantResult(body);
                } catch (error) {
                  setAssistantError(
                    error instanceof Error
                      ? error.message
                      : "Please contact the team.",
                  );
                } finally {
                  setAssistantBusy(false);
                }
              }}
            >
              <label htmlFor="toc-guide-question">
                {t(L("Ask about a service", "Uliza kuhusu huduma"))}
              </label>
              <textarea
                id="toc-guide-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={1500}
                minLength={2}
                required
                placeholder={t(
                  L(
                    "No personal details, passwords or keys",
                    "Usiweke taarifa binafsi, nywila au funguo",
                  ),
                )}
              />
              <button
                className="platform-small-button"
                disabled={assistantBusy}
                type="submit"
              >
                {assistantBusy
                  ? t(
                      L(
                        "Checking published information…",
                        "Tunapitia taarifa zilizochapishwa…",
                      ),
                    )
                  : t(
                      L(
                        "Find approved guidance",
                        "Tafuta mwongozo ulioidhinishwa",
                      ),
                    )}
              </button>
            </form>
            {assistantError && <p role="alert">{assistantError}</p>}
            {assistantResult && (
              <div
                className="guide-answer guide-dynamic-answer"
                aria-live="polite"
              >
                <small>
                  {assistantResult.aiUsed
                    ? t(
                        L(
                          "AI-selected approved excerpts",
                          "Maelezo yaliyoidhinishwa yaliyochaguliwa na AI",
                        ),
                      )
                    : t(
                        L(
                          "Published-content guide · not AI",
                          "Mwongozo wa maudhui yaliyochapishwa · si AI",
                        ),
                      )}
                </small>
                <p>{assistantResult.answer}</p>
                {assistantResult.sources?.map((source) => (
                  <Link key={source.id} href={source.href}>
                    {source.title} →
                  </Link>
                ))}
              </div>
            )}
            <ButtonLink href="/request-quotation" className="guide-cta">
              {t(L("Start a request", "Anza ombi"))}
            </ButtonLink>
            <a className="guide-email" href={`mailto:${company.email}`}>
              {t(
                L(
                  "Prefer a person? Email our team",
                  "Unapendelea mtu? Tuma barua pepe",
                ),
              )}
              <Send size={12} />
            </a>
          </div>
          <div className="guide-disclosure">
            {t(
              L(
                "A self-service guide, not a live chat or AI agent.",
                "Mwongozo wa kujihudumia, si mazungumzo ya moja kwa moja wala AI.",
              ),
            )}
          </div>
        </section>
      )}
      <button
        ref={triggerRef}
        className={`guide-trigger${open ? " guide-trigger-open" : ""}`}
        onClick={() => {
          if (open) dismiss();
          else setOpen(true);
        }}
        aria-label={t(L("Open TOC service guide", "Fungua mwongozo wa TOC"))}
        aria-expanded={open}
      >
        {open ? (
          <X size={23} />
        ) : (
          <>
            <MessageCircle size={21} />
            <span>{t(L("Need a hand?", "Tukusaidie?"))}</span>
            <span className="guide-status" />
          </>
        )}
      </button>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const staff =
    path.startsWith("/staff") ||
    path.startsWith("/admin") ||
    path.startsWith("/portal");
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!staff && <Header />}
      <main id="main">{children}</main>
      {!staff && (
        <>
          <Footer />
          <ServiceGuide />
        </>
      )}
    </>
  );
}
