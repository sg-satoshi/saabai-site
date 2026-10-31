"use client";
/** Client portal chatbot settings. Same editor as admin, without plan, install or the lock control. */
import { useEffect, useState } from "react";
import ChatbotEditor, { type EditorRow } from "../../saabai-admin/chatbots/ChatbotEditor";
import { DEFAULT_ENGAGE, type EngageConfig } from "../../../lib/chatbot/engage";
import type { GoalConfig } from "../../../lib/chatbot/goal";
import type { Faq, PublicWidgetConfig, Tone } from "../../../lib/chatbot/core";
import "../../saabai-admin/chatbots/chatbots.css";

type Payload = {
  site: { name: string; slug?: string };
  goal: GoalConfig | null;
  engage: EngageConfig;
  locked?: string[];
  botLock?: { locked: boolean; by?: string; at?: string };
  plan?: string;
  skin?: { showPoweredBy?: boolean };
  tone?: Tone;
  knowledge?: { facts: string; faqs: Faq[] };
  canRemovePoweredBy?: boolean;
  resolved?: PublicWidgetConfig | null;
  enabled?: boolean | null;
  error?: string;
};

const fallbackResolved = (name: string): PublicWidgetConfig => ({
  v: 1, active: true, botName: name, greeting: "", avatarUrl: "", primary: "#0b5c78", accent: "#62c5d1", bg: "#fbfbfd", text: "#13152a",
  position: "right", poweredBy: true, placeholder: "", offMessage: "", handoff: null, goal: null,
  engage: { endChat: true, emailCopy: false, openers: [], exitIntent: false, idleSeconds: 0, scrollPercent: 0, freeOffer: null, offer: null, returnGreeting: "", review: null, nudgeCap: 3 },
  sensitiveNotice: "",
  privacyUrl: "",
});

export function ChatbotSettingsPanel({ readOnly }: { readOnly?: boolean }) {
  const [row, setRow] = useState<EditorRow | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch("/api/portal/chatbot");
    const d = (await r.json()) as Payload;
    if (!r.ok) throw new Error(d.error || "Couldn't load your chatbot");
    const name = d.site?.name || "Your chatbot";
    setRow({
      slug: d.site?.slug || "",
      name,
      plan: d.plan || "presence",
      enabled: d.enabled ?? null,
      skin: d.skin ?? {},
      resolved: d.resolved ?? fallbackResolved(name),
      tone: d.tone ?? "friendly",
      knowledge: d.knowledge ?? { facts: "", faqs: [] },
      goal: d.goal,
      engage: d.engage ?? DEFAULT_ENGAGE,
      canRemovePoweredBy: d.canRemovePoweredBy,
      botLock: d.botLock,
      lastChange: d.botLock?.at ? { at: d.botLock.at, by: d.botLock.by } : undefined,
    });
  }

  useEffect(() => {
    load().catch((e) => setErr((e as Error).message));
  }, []);

  if (!row) return <div style={{ padding: 8, color: "var(--n-500)" }}>{err || "Loading…"}</div>;
  return (
    <div data-testid="portal-chatbot">
      {err && <p role="alert">{err}</p>}
      {readOnly && <div className="lockbanner" role="status" style={{ margin: "12px 32px" }}>Viewing as client. Changes are disabled.</div>}
      <ChatbotEditor mode="client" row={row} readOnly={!!readOnly || !!row.botLock?.locked} onSaved={() => load().catch((e) => setErr((e as Error).message))} />
    </div>
  );
}
