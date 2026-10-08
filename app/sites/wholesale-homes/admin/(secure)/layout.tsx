import type { ReactNode } from "react";
import { headers } from "next/headers";
import { requireWholesaleAdmin } from "../../_lib/require-admin";
import { wholesaleBasePath } from "../../../../../lib/wholesale-paths";
import { WhBaseProvider } from "../../_lib/base-context";

// Server-side gate for every Wholesale admin page (the login page sits
// outside this route group). Admin = the Wholesale admin login or a Saabai
// admin session; see lib/wholesale-admin-auth.ts.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | Wholesale Homes", robots: { index: false, follow: false } };

export default async function WholesaleAdminLayout({ children }: { children: ReactNode }) {
  await requireWholesaleAdmin();
  const base = wholesaleBasePath((await headers()).get("host"));
  return <WhBaseProvider base={base}>{children}</WhBaseProvider>;
}
