import { LegalPage } from "@/components/pages";
import { ContentDetail } from "@/components/public-content";
import { publicPage, publicPageMetadata } from "@/lib/public-pages";
export function generateMetadata() {
  return publicPageMetadata("terms", {
    title: "Website terms of use",
    description:
      "Website use and the distinction between inquiries, quotations and confirmed bookings.",
    alternates: { canonical: "/terms" },
  });
}
export default function Page() {
  const item = publicPage("terms");
  return item ? <ContentDetail item={item} /> : <LegalPage kind="terms" />;
}
