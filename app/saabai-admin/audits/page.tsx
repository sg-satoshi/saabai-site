import { requireAdmin } from "../../../lib/require-admin";
import AuditsClient from "./AuditsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blueprints - Saabai" };

export default async function AuditsPage() {
  await requireAdmin("/saabai-admin/audits");

  return <AuditsClient />;
}
