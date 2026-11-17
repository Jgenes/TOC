import type { Metadata } from "next";
import type { ContentSeo } from "./content";
import { publishedContent } from "./platform-cms";

// Functional/private routes cannot be shadowed by an editorial page.
export const reservedPageSlugs = new Set([
  "admin",
  "portal",
  "api",
  "staff",
  "services",
  "contact",
  "request-quotation",
  "projects",
  "clients",
  "news",
  "careers",
  "gallery",
  "downloads",
  "opportunities",
  "privacy-policy",
  "robots.txt",
  "sitemap.xml",
]);
export function publicPage(slug: string) {
  return publishedContent("page").find((item) => item.slug === slug);
}
export function publicPageMetadata(
  slug: string,
  fallback: Metadata = {},
): Metadata {
  const item = publicPage(slug);
  if (!item) return fallback;
  return contentMetadata(
    item.data as Parameters<typeof contentMetadata>[0],
    `/${slug}`,
  );
}

export function contentMetadata(
  data:
    | {
        title?: { en: string };
        summary?: { en: string };
        description?: { en: string };
        image?: string;
        seo?: ContentSeo;
      }
    | undefined,
  path: string,
  fallback = "TOC Investment",
): Metadata {
  const title = data?.seo?.title || data?.title?.en || fallback,
    description =
      data?.seo?.description || data?.summary?.en || data?.description?.en,
    canonical = data?.seo?.canonicalPath || path;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: data?.seo?.socialTitle || title,
      description: data?.seo?.socialDescription || description,
      url: canonical,
      ...(data?.image ? { images: [data.image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: data?.seo?.socialTitle || title,
      description: data?.seo?.socialDescription || description,
      ...(data?.image ? { images: [data.image] } : {}),
    },
  };
}
