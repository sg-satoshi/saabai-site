import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import LexPrivacyClient from "./LexPrivacyClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Privacy Log | Saabai Admin" };

export default async function LexPrivacyPage() {
  await requireAdmin("/saabai-admin/lex-privacy");
  return (
    <AdminShell activePath="/saabai-admin/lex-privacy">
      <LexPrivacyClient />
    </AdminShell>
  );
}
