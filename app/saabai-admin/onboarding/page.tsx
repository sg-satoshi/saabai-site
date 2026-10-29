import { requireAdmin } from "../../../lib/require-admin";
import AdminShell from "../AdminSidebar";
import OnboardingAdminClient from "./OnboardingAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Onboarding" };

export default async function OnboardingAdminPage() {
  await requireAdmin("/saabai-admin/onboarding");
  return (
    <AdminShell activePath="/saabai-admin/onboarding">
      <OnboardingAdminClient />
    </AdminShell>
  );
}
