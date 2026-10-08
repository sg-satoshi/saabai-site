import type { ReactNode } from "react";
import { requireWholesaleClient } from "../../_lib/require-client";

// Server-side gate: members only. (/client/register stays public.)
export const dynamic = "force-dynamic";

export default async function MembersLayout({ children }: { children: ReactNode }) {
  await requireWholesaleClient();
  return children;
}
