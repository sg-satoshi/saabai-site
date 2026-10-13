import { requireAdmin } from "../../../lib/require-admin";
import LexClientsClient from "./LexClientsClient";
import AdminShell from "../AdminSidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Clients — Saabai Admin" };

export default async function LexClientsPage() {
  await requireAdmin("/saabai-admin/lex-clients");

  return (
    <AdminShell activePath="/saabai-admin/lex-clients">
      <LexClientsClient />
    </AdminShell>
  );
}
