import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import ExperimentsClient from "./ExperimentsClient";
import VisualEditor from "./VisualEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Split testing" };

export default async function ExperimentsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  await requireAdmin("/saabai-admin/experiments");
  return (
    <AdminShell activePath="/saabai-admin/experiments">
      {view === "editor" ? <VisualEditor /> : <ExperimentsClient />}
    </AdminShell>
  );
}
