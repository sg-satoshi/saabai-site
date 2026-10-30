import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import LexFeedbackClient from "./LexFeedbackClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Feedback — Saabai Admin" };

export default async function LexFeedbackPage() {
  await requireAdmin("/saabai-admin/lex-feedback");
  return (
    <AdminShell activePath="/saabai-admin/lex-feedback">
      <LexFeedbackClient />
    </AdminShell>
  );
}
