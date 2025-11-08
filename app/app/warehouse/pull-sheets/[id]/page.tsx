import PullSheetDetailClient from "./PullSheetDetailClient";
import { getPullsheetPermissions } from "@/lib/permissions";

export default async function PullSheetDetailPage() {
  const permissions = await getPullsheetPermissions();

  return <PullSheetDetailClient permissions={permissions} />;
}
