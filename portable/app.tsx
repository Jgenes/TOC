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
import { ContentListing, SupplierPage } from "../components/public-content";
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
  const alias =
    pathname === "/services/cleaning"
      ? "/services/general-cleaning"
      : pathname === "/services/ict"
        ? "/services/ict-solutions"
        : pathname;
  const service = services.find((s) => alias === `/services/${s.slug}`);
  const listing: Record<string, string> = {
    "/projects": "project",
    "/clients": "client",
    "/news": "article",
    "/careers": "career",
    "/downloads": "document",
    "/about/leadership": "team",
  };
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
    ) : listing[pathname] ? (
      <ContentListing type={listing[pathname]} />
    ) : pathname === "/opportunities" ? (
      <SupplierPage />
    ) : ["/quality-and-safety", "/about/quality-and-safety"].includes(
        pathname,
      ) ? (
      <QualityPage />
    ) : ["/privacy", "/privacy-policy"].includes(pathname) ? (
      <LegalPage kind="privacy" />
    ) : pathname === "/terms" ? (
      <LegalPage kind="terms" />
    ) : pathname === "/request-quotation" ? (
      <QuotationPage
        key={route}
        initialService={new URLSearchParams(query).get("service") || ""}
      />
    ) : ["/staff", "/admin", "/portal"].some(
        (path) => pathname === path || pathname.startsWith(path + "/"),
      ) ? (
      <section className="staff-login-page">
        <Link href="/">
          <Logo />
        </Link>
        <div className="staff-login-card">
          <div className="eyebrow">
            <span />
            LIVE WEBSITE FEATURE
          </div>
          <h1>The protected TOC platform.</h1>
          <p>
            Customer accounts, the CMS, staff workspaces and saved records
            require the running TOC website. This portable file contains public
            design screens only; it cannot sign in, publish content or submit
            inquiries.
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
// Opaque document viewers are not secure contexts, so randomUUID may be absent.
// Keep this compatibility shim confined to the standalone design bundle. It uses
// Web Crypto randomness and never grants a server session or submits a request.
if (typeof crypto.randomUUID !== "function")
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
  });
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
        document.documentElement.lang === "sw"
          ? "Hili ni hakikisho la muundo pekee. Maombi hayawezi kutumwa hapa. Tumia tovuti inayoendeshwa katika Arena au mradi wa chanzo uliojumuishwa."
          : "This is the portable design preview. Requests cannot be submitted here. Please use the live website in Arena, or run the included source project.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
createRoot(document.getElementById("root")!).render(<PortableApp />);
