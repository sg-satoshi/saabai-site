import { requireAdmin } from "../../../lib/require-admin";
import { twoFactorStatus } from "../../../lib/admin-2fa";
import SecurityClient from "./SecurityClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security | Saabai Admin", robots: { index: false, follow: false } };

export default async function SecurityPage() {
  const id = await requireAdmin("/saabai-admin/security");
  const status = await twoFactorStatus(id);
  return <SecurityClient initial={status} />;
}
