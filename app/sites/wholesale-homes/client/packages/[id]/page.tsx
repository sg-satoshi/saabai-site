import { getPackageDetail } from "../../../_data/member-packages";
import PackageDetailClient from "./PackageDetailClient";

// Server component: only the one package being viewed is sent to the
// browser, and only to signed-in members (see ../layout.tsx).
export default async function ClientPackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackageDetailClient pkg={getPackageDetail(id)} />;
}
