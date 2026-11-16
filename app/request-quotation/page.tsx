import { QuotationPage } from "@/components/request-form";
export const metadata = {
  title: "Request a quotation",
  description:
    "Tell TOC about your occasion in a simple guided inquiry. No payment or automatic booking is made.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  return <QuotationPage initialService={params.service} />;
}
