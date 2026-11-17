import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "Projects & portfolio",
  alternates: { canonical: "/projects" },
};
export default function Page() {
  return <ContentListing type="project" />;
}
