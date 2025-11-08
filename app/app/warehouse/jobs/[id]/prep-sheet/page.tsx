
export const dynamic = "force-dynamic";
import PrepSheetClient from "./PrepSheetClient";

export default function Page({ params }: { params: { id: string } }) {
  return <PrepSheetClient jobId={params.id} />;
}
