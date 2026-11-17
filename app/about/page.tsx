import { AboutPage } from "@/components/pages";
import { ContentDetail } from "@/components/public-content";
import { publicPage, publicPageMetadata } from "@/lib/public-pages";
export function generateMetadata() {
  return publicPageMetadata("about", {
    title: "About TOC",
    description:
      "Five coordinated professional service divisions: events, catering, cleaning, ICT and production.",
    alternates: { canonical: "/about" },
  });
}
export default function Page() {
  const item = publicPage("about");
  return item ? <ContentDetail item={item} /> : <AboutPage />;
}
