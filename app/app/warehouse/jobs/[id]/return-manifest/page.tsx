
export const dynamic = "force-dynamic";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ReturnManifestClient from "./ReturnManifestClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DashboardLayout>
      <ReturnManifestClient jobId={id} />
    </DashboardLayout>
  );
}
