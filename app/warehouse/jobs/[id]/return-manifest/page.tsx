
export const dynamic = "force-dynamic";
import ReturnManifestClient from "./ReturnManifestClient";

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnManifestClient jobId={params.id} />;
}
