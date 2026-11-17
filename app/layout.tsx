import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./platform.css";
import { PublicShell, SiteProvider } from "@/components/site-shell";
import { publicBundle } from "@/lib/platform-cms";
import { isPreview } from "@/lib/content";

export function generateMetadata(): Metadata {
  const { profile, content } = publicBundle();
  const home = content.find((row) => row.type === "homepage");
  const hero = String(home?.data.heroImage || "/assets/hero.webp");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: {
      default: "TOC Investment — A Touch of Class",
      template: "%s | TOC Investment",
    },
    description:
      "Event management, catering, general cleaning, ICT and production. TOC Investment Company Limited — Touch of Class, Dodoma, Tanzania.",
    applicationName: "TOC Investment",
    icons: { icon: "/favicon.svg" },
    robots: { index: !isPreview, follow: !isPreview },
    openGraph: {
      title: "TOC Investment — A Touch of Class",
      description: "Exceptional experiences. A touch of class.",
      type: "website",
      locale: "en_TZ",
      siteName: String(profile.name),
      images: [
        {
          url: hero,
          width: 1536,
          height: 688,
          alt: "Illustrative elegant ballroom — TOC website design",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "TOC Investment — A Touch of Class",
      images: [hero],
    },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c91f2a",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/fonts/manrope-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/inter-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SiteProvider initialData={publicBundle()}>
          <PublicShell>{children}</PublicShell>
        </SiteProvider>
      </body>
    </html>
  );
}
