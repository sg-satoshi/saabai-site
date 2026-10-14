import { requireAdmin } from "../../lib/require-admin";
import PulseClient from "./PulseClient";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PulsePage() {
  await requireAdmin("/pulse");
  return <PulseClient />;
}
