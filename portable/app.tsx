import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HomePage,
  AboutPage,
  ServicesPage,
  ServiceDetailPage,
  GalleryPage,
  ContactPage,
  QualityPage,
  LegalPage,
} from "../components/pages";
import { QuotationPage } from "../components/request-form";
import { SiteProvider, PublicShell, Logo } from "../components/site-shell";
import { services } from "../lib/content";
import { PathContext } from "./navigation";
import Link from "./link";

function PortableApp() {
  const [route, setRoute] = useState(
    location.hash.startsWith("#/") ? location.hash.slice(1) : "/",
  );
  useEffect(() => {
    const update = () => {
      if (location.hash.startsWith("#/")) {
        setRoute(location.hash.slice(1));
        window.scrollTo(0, 0);
      }
    };
    const anchor = (event: MouseEvent) => {
      const a = (event.target as Element).closest("a");
      const href = a?.getAttribute("href");
      if (href?.startsWith("#") && !href.startsWith("#/")) {
        event.preventDefault();
        document
          .getElementById(href.slice(1))
          ?.scrollIntoView({ behavior: "smooth" });
      }
    };
    const navigate = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === "string" && next.startsWith("/")) {
        setRoute(next);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", update);
    document.addEventListener("click", anchor);
    window.addEventListener("toc:navigate", navigate);
    return () => {
      window.removeEventListener("hashchange", update);
      document.removeEventListener("click", anchor);
      window.removeEventListener("toc:navigate", navigate);
    };
  }, []);
  const [pathname, query] = route.split("?");
  const service = services.find((s) => pathname === `/services/${s.slug}`);
  const page =
    pathname === "/" ? (
      <HomePage />
    ) : pathname === "/about" ? (
      <AboutPage />
    ) : pathname === "/services" ? (
      <ServicesPage />
    ) : service ? (
      <ServiceDetailPage service={service} />
    ) : pathname === "/gallery" ? (
      <GalleryPage />
    ) : pathname === "/contact" ? (
      <ContactPage />
    ) : pathname === "/quality-and-safety" ? (
      <QualityPage />
    ) : pathname === "/privacy" ? (
      <LegalPage kind="privacy" />
    ) : pathname === "/terms" ? (
      <LegalPage kind="terms" />
    ) : pathname === "/request-quotation" ? (
      <QuotationPage
        key={route}
        initialService={new URLSearchParams(query).get("service") || ""}
      />
    ) : pathname === "/staff" ? (
      <section className="staff-login-page">
        <Link href="/">
          <Logo />
        </Link>
        <div className="staff-login-card">
          <div className="eyebrow">
            <span />
            LIVE WEBSITE FEATURE
          </div>
          <h1>The staff inbox.</h1>
          <p>
            Staff authentication and saved inquiries are available in the
            running TOC website, not this portable design preview.
          </p>
          <p>
            Use the live preview in Arena or run the included Next.js source
            project. Private staff credentials are provided separately.
          </p>
          <Link className="button button-primary" href="/">
            Back to the website
          </Link>
        </div>
      </section>
    ) : (
      <HomePage />
    );
  return (
    <PathContext.Provider value={route}>
      <SiteProvider>
        <div className="offline-banner">
          <strong>PORTABLE WEBSITE PREVIEW</strong>
          <span>
            Explore the pages in English or Kiswahili. Form submission and staff
            access require the live website.
          </span>
        </div>
        <PublicShell>{page}</PublicShell>
      </SiteProvider>
    </PathContext.Provider>
  );
}

// File viewers can use an opaque origin, where browser storage is unavailable.
// In that environment, only remember language for the current tab. Draft UI is hidden.
try {
  const key = "__toc_storage_test";
  localStorage.setItem(key, "1");
  localStorage.removeItem(key);
} catch {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
  });
}
// Sandboxed document viewers do not grant native form-submission permission.
// Dispatch the React validation event ourselves; the offline fetch below never sends data.
document.addEventListener(
  "click",
  (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (button?.form && !button.disabled) {
      event.preventDefault();
      button.form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    }
  },
  true,
);
// There is no backend in a standalone HTML file. Never imply that an inquiry was saved.
window.fetch = async () =>
  new Response(
    JSON.stringify({
      error:
        "This is the portable design preview. Requests cannot be submitted here. Please use the live website in Arena, or run the included source project.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
createRoot(document.getElementById("root")!).render(<PortableApp />);
