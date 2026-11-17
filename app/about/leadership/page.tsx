import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "Leadership",
  alternates: { canonical: "/about/leadership" },
};
export default function Page() {
  return <ContentListing type="team" />;
}
