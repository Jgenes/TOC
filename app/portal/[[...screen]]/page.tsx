import type { Metadata } from "next";
import { PlatformApp } from "@/components/platform-app";
export const metadata: Metadata = {
  title: "Customer portal",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  const { screen } = await params;
  return <PlatformApp staff={false} initialScreen={screen?.[0] || ""} />;
}
