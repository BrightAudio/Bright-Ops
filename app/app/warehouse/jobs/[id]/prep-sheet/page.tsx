
export const dynamic = "force-dynamic";
import PrepSheetClient from "./PrepSheetClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <PrepSheetClient jobId={resolvedParams.id} />;
}
