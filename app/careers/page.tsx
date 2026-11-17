import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "Careers & opportunities",
  alternates: { canonical: "/careers" },
};
export default function Page() {
  return <ContentListing type="career" />;
}
