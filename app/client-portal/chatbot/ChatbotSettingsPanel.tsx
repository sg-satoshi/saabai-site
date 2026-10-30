"use client";
/** Client portal: the client's own chatbot goal, buttons and questions. */
import React, { useEffect, useState } from "react";
import "../../components/billing/billing.css";
import GoalEditor, { EMPTY_GOAL } from "../../components/chatbot/GoalEditor";
import type { GoalConfig } from "../../../lib/chatbot/goal";
import EngageEditor from "../../components/chatbot/EngageEditor";
import { DEFAULT_ENGAGE, type EngageConfig } from "../../../lib/chatbot/engage";

type Data = { site: { name: string }; goal: GoalConfig | null; locked: string[]; engage: EngageConfig };

export function ChatbotSettingsPanel({ readOnly }: { readOnly?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [goal, setGoal] = useState<GoalConfig>(EMPTY_GOAL);
  const [engage, setEngage] = useState<EngageConfig>(DEFAULT_ENGAGE);
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/portal/chatbot").then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't load your chatbot");
      setData(d); setGoal(d.goal ?? EMPTY_GOAL); setEngage(d.engage ?? DEFAULT_ENGAGE);
    }).catch((e) => setErr((e as Error).message));
  }, []);

  async function save() {
    setBusy(true); setErr(""); setOk(""); setFields({});
    try {
      const r = await fetch("/api/portal/chatbot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal, engage }) });
      const d = await r.json();
      if (!r.ok) { setFields(d.fields ?? {}); throw new Error(d.error || "Couldn't save"); }
      setGoal(d.goal ?? EMPTY_GOAL); setEngage(d.engage ?? DEFAULT_ENGAGE); setOk("Saved. Your chatbot picks this up within about a minute.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  if (!data) return <div className="bl" style={{ padding: 8, color: "#5f6580" }}>{err || "Loading…"}</div>;
  return (
    <div className="bl" data-testid="portal-chatbot">
      <div className="ph">
        <div>
          <h1>Chatbot</h1>
          <div className="sub">{data.site.name} · Choose what your chatbot works towards and the buttons it shows.</div>
        </div>
      </div>
      {readOnly && <div className="bl-banner">Viewing as client. Changes are disabled.</div>}
      {ok && <div className="bl-ok" style={{ marginBottom: 12 }}>{ok}</div>}
      {err && <div className="bl-err" style={{ marginBottom: 12 }}>{err}</div>}
      <GoalEditor value={goal} onChange={setGoal} errors={fields} mode="client" readOnly={readOnly} />
      <EngageEditor value={engage} onChange={setEngage} errors={fields} readOnly={readOnly} />
      <button className="bl-btn pri" onClick={() => void save()} disabled={busy || readOnly} data-testid="portal-chatbot-save">{busy ? "Saving" : "Save chatbot settings"}</button>
    </div>
  );
}
