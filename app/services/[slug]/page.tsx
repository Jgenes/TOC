import { notFound, permanentRedirect } from "next/navigation";
import { contentMetadata } from "@/lib/public-pages";
import type { Metadata } from "next";
import { publicBundle } from "@/lib/platform-cms";
import { platformDb } from "@/lib/platform-store";
import { ServiceDetailPage } from "@/components/pages";
export function generateStaticParams() {
  return publicBundle().catalog.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = publicBundle().catalog.find((s) => s.slug === slug);
  return contentMetadata(service, `/services/${slug}`, "Service not found");
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = publicBundle().catalog.find((s) => s.slug === slug);
  if (!service) {
    const redirect = platformDb()
      .prepare("SELECT new_path FROM content_redirects WHERE old_path=?")
      .get(`/services/${slug}`) as { new_path: string } | undefined;
    if (redirect) permanentRedirect(redirect.new_path);
    notFound();
  }
  return <ServiceDetailPage service={service} />;
}
