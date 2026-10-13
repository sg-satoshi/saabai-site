import { requireAdmin } from "../../../../lib/require-admin";
import InstagramAdminPage from "./InstagramAdminPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instagram | Social Media | Saabai Admin" };

export default async function Page() {
  await requireAdmin("/saabai-admin/social/instagram");
  return <InstagramAdminPage />;
}
