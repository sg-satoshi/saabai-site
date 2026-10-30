import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import LexTrialsClient from "./LexTrialsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Trials — Saabai Admin" };

export default async function LexTrialsPage() {
  await requireAdmin("/saabai-admin/lex-trials");
  return (
    <AdminShell activePath="/saabai-admin/lex-trials">
      <LexTrialsClient />
    </AdminShell>
  );
}
