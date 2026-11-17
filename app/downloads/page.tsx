import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "Company documents",
  alternates: { canonical: "/downloads" },
};
export default function Page() {
  return <ContentListing type="document" />;
}
