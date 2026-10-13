import { requireAdmin } from "../../../../lib/require-admin";
import LinkedInAdminPage from "./LinkedInAdminPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "LinkedIn | Social Media | Saabai Admin" };
export default async function Page() {
  await requireAdmin("/saabai-admin/social/linkedin"); return <LinkedInAdminPage />; }
