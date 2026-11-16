import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { services } from "@/lib/content";
import { ServiceDetailPage } from "@/components/pages";
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  return {
    title: service?.title.en || "Service not found",
    description: service?.description.en,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();
  return <ServiceDetailPage service={service} />;
}
