import { requireAdmin } from "../../../../lib/require-admin";
import PreviewFrame from "./PreviewFrame";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Announcement preview", robots: { index: false, follow: false } };

/** Admin only. Rendered inside an iframe on the Announcements page so the preview gets real viewport widths and media queries. */
export default async function PreviewPage() {
  await requireAdmin("/saabai-admin/announcements");
  return <PreviewFrame />;
}
