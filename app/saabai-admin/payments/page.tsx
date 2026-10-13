import { requireAdmin } from "../../../lib/require-admin";
import { getPublishableKey } from "../../../lib/stripe";
import PaymentsClient from "./PaymentsClient";

export const metadata = { title: "Payments — Saabai Admin" };

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireAdmin("/saabai-admin/payments");

  return <PaymentsClient publishableKey={getPublishableKey()} />;
}
