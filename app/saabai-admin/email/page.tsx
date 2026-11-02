import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import EmailClient from "./EmailClient";
import "./email.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "SUNDER email" };

export default async function Page() {
  await requireAdmin("/saabai-admin/email");
  return (
    <AdminShell activePath="/saabai-admin/email">
      <EmailClient />
    </AdminShell>
  );
}
