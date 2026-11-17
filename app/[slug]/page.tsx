import { notFound } from "next/navigation";
import { ContentDetail } from "@/components/public-content";
import {
  publicPage,
  publicPageMetadata,
  reservedPageSlugs,
} from "@/lib/public-pages";
export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return params.then(({ slug }) => publicPageMetadata(slug));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = reservedPageSlugs.has(slug) ? undefined : publicPage(slug);
  if (!item) notFound();
  return <ContentDetail item={item} />;
}
