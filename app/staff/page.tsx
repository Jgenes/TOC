import { StaffInbox } from "@/components/staff-inbox";
export const metadata = {
  title: "Staff inquiry inbox",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <StaffInbox />;
}
