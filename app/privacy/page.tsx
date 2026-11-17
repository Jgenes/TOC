import { LegalPage } from "@/components/pages";
import { ContentDetail } from "@/components/public-content";
import { publicPage, publicPageMetadata } from "@/lib/public-pages";
export function generateMetadata() {
  return publicPageMetadata("privacy", {
    title: "Privacy notice",
    description:
      "Personal data handling, customer rights and approved service communications.",
    alternates: { canonical: "/privacy" },
  });
}
export default function Page() {
  const item = publicPage("privacy");
  return item ? <ContentDetail item={item} /> : <LegalPage kind="privacy" />;
}
