import type { MetadataRoute } from "next";
import { publicBundle, publishedContent } from "@/lib/platform-cms";
import { isPreview } from "@/lib/content";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base || isPreview) return [];
  return [
    "",
    "/about",
    "/services",
    ...publicBundle().catalog.map((s) => `/services/${s.slug}`),
    "/gallery",
    "/projects",
    "/clients",
    "/news",
    "/careers",
    "/opportunities",
    "/downloads",
    "/about/leadership",
    ...publishedContent()
      .filter((item) => ["project", "article", "page"].includes(item.type))
      .map(
        (item) =>
          `${item.type === "project" ? "/projects" : item.type === "article" ? "/news" : ""}/${item.slug}`,
      ),
    "/contact",
    "/request-quotation",
    "/quality-and-safety",
    "/privacy",
    "/terms",
  ]
    .filter((path, index, paths) => paths.indexOf(path) === index)
    .map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "monthly",
      priority: path === "" ? 1 : 0.7,
    }));
}
