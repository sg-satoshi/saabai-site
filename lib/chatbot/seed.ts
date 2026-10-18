import { getConfig, saveConfig } from "./store";
import { validateSkin } from "./core";

/** Safe rollout flag: factory sites get the new one-line widget only when CHAT_WIDGET_V2=1. Off by default. */
export const widgetV2Enabled = () => process.env.CHAT_WIDGET_V2 === "1";

export { WIDGET_SRC, installSnippet } from "./seed-shared";

/**
 * Give a new platform site its starting look (the colours and name the old widget would have used),
 * but never overwrite a skin an admin has already saved. Failures are ignored: the widget falls back to defaults.
 */
export async function seedPlatformSkin(slug: string, cfg: { botName: string; greeting: string; primaryColor: string; accentColor: string; bgColor: string; textColor: string; avatarUrl?: string }): Promise<void> {
  try {
    const cur = await getConfig(slug);
    if (cur.updatedAt) return;
    const v = validateSkin({ botName: cfg.botName, greeting: cfg.greeting, primary: cfg.primaryColor, accent: cfg.accentColor, bg: cfg.bgColor, text: cfg.textColor, ...(cfg.avatarUrl ? { avatarUrl: cfg.avatarUrl } : {}) });
    if (!v.ok) return;
    await saveConfig({ ...cur, skin: v.value, updatedBy: "site-factory" });
  } catch (e) {
    console.error("seedPlatformSkin failed (ignored):", e);
  }
}
