import type { Metadata } from "next";
import { ContentListing } from "@/components/public-content";
export const metadata: Metadata = {
  title: "Clients & partners",
  alternates: { canonical: "/clients" },
};
export default function Page() {
  return <ContentListing type="client" />;
}
