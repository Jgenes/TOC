import { notFound, permanentRedirect } from "next/navigation";
import { contentMetadata } from "@/lib/public-pages";
import type { Metadata } from "next";
import { publishedContent } from "@/lib/platform-cms";
import { platformDb } from "@/lib/platform-store";
import { ContentDetail } from "@/components/public-content";
function record(slug: string) {
  return publishedContent("project").find((item) => item.slug === slug);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = record(slug);
  return contentMetadata(
    item?.data as Parameters<typeof contentMetadata>[0],
    `/projects/${slug}`,
    "Project not found",
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = record(slug);
  if (!item) {
    const redirect = platformDb()
      .prepare("SELECT new_path FROM content_redirects WHERE old_path=?")
      .get(`/projects/${slug}`) as { new_path: string } | undefined;
    if (redirect) permanentRedirect(redirect.new_path);
    notFound();
  }
  return <ContentDetail item={item} />;
}
