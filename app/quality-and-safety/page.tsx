import { QualityPage } from "@/components/pages";
import { ContentDetail } from "@/components/public-content";
import { publicPage, publicPageMetadata } from "@/lib/public-pages";
export function generateMetadata() {
  return publicPageMetadata("quality-and-safety", {
    title: "Quality & care",
    description:
      "TOC’s approach to clear service scope, safe coordination and responsible service delivery.",
    alternates: { canonical: "/quality-and-safety" },
  });
}
export default function Page() {
  const item = publicPage("quality-and-safety");
  return item ? <ContentDetail item={item} /> : <QualityPage />;
}
