import PullSheetsClient from "./PullSheetsClient";
import { getPullsheetPermissions } from "@/lib/permissions";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function PullSheetsPage() {
  const permissions = await getPullsheetPermissions();

  return (
    <DashboardLayout>
      <PullSheetsClient permissions={permissions} />
    </DashboardLayout>
  );
}
