
export const dynamic = "force-dynamic";
import ReturnManifestClient from "./ReturnManifestClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReturnManifestClient jobId={id} />;
}
