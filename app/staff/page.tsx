import { redirect } from "next/navigation";
import { isPreview } from "@/lib/content";
import { StaffInbox } from "@/components/staff-inbox";
export const metadata = {
  title: "Staff inquiry inbox",
  robots: { index: false, follow: false },
};
export default function Page() {
  if (!isPreview) redirect("/admin");
  return <StaffInbox />;
}
