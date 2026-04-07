/**
 * /lex-widget — Embeddable iframe widget page
 *
 * Routing:
 *   ?client=tributum (or unset, legacy)  → Tributum Law's LexWidget (gold/cream, existing)
 *   ?client=<any other lex client id>    → LexAvatarWidget (navy/gold, new platform)
 *
 * Embed on any website:
 *   <iframe
 *     id="lex-widget"
 *     src="https://saabai.ai/lex-widget?client=YOUR_CLIENT_ID"
 *     style="position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;"
 *   />
 *   <script>
 *     window.addEventListener("message", function(e) {
 *       if (e.data && e.data.lexWidget) {
 *         var f = document.getElementById("lex-widget");
 *         f.style.cssText = e.data.lexWidget === "open"
 *           ? "position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;"
 *           : "position:fixed;bottom:0;right:0;width:88px;height:88px;border:none;z-index:9999;";
 *       }
 *     });
 *   </script>
 */

import LexWidget from "../components/LexWidget";
import LexAvatarWidgetPage from "./LexAvatarWidgetPage";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ client?: string }>;
}

export default async function LexWidgetPage({ searchParams }: Props) {
  const { client } = await searchParams;

  // Legacy Tributum Law widget — default when no client param or explicit "tributum"
  const isTributum = !client || client === "tributum" || client === "tributum-law";

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      `}</style>
      {isTributum ? (
        <LexWidget />
      ) : (
        <LexAvatarWidgetPage clientId={client} />
      )}
    </>
  );
}
