import PeterAvatarWidget from "../components/PeterAvatarWidget";
import { getClientConfig } from "../../lib/rex-config";

// This page is loaded inside a small bottom-right iframe on client websites.
// The iframe is sized to fit the widget — no full-page overlay needed.
// Pass ?client=<id> to load a different client config (defaults to plon).
export default async function RexWidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const config = getClientConfig(client);
  return <PeterAvatarWidget clientId={client} quickReplies={config.quickReplies} />;
}
