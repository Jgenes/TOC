import type { MetadataRoute } from "next";
import { isPreview } from "@/lib/content";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: isPreview ? undefined : "/",
      disallow: isPreview ? "/" : ["/staff", "/admin", "/portal", "/api/"],
    },
    sitemap: !isPreview && base ? `${base}/sitemap.xml` : undefined,
  };
}
