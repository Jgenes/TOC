import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "News & insights",
  alternates: { canonical: "/news" },
};
export default function Page() {
  return <ContentListing type="article" />;
}
