import type { MetadataRoute } from "next";
import { isPreview, services } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base || isPreview) return [];
  return [
    "",
    "/about",
    "/services",
    ...services.map((s) => `/services/${s.slug}`),
    "/gallery",
    "/contact",
    "/request-quotation",
    "/quality-and-safety",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
