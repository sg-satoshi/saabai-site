"use client";

/**
 * Admin review queue. Sending a draft to the client only changes its status.
 * It does not email them and it does not publish the FAQ.
 */

import { useEffect, useState, type CSSProperties } from "react";
import AdminShell from "../AdminSidebar";

type Draft = {
  id: string;
  question: string;
  answer: string;
  source: string;
  sourceDetail: string;
  status: string;
};

type Item = {
  id: string;
  firmName: string;
  contactName: string;
  generatedAt: string;
  questionBank: string;
  published: false;
  onboardingPath: string;
  drafts: Draft[];
  faqPage: unknown;
};

export default function FaqQueueClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/blueprint-faqs")
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("The queue could not be loaded.");
      });
    return () => { cancelled = true; };
  }, []);

  async function act(engagementId: string, draftId: string, action: "to_client" | "hold") {
    setBusy(draftId);
    setError(null);
    const res = await fetch("/api/admin/blueprint-faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engagementId, draftId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "That update did not save.");
    else {
      setItems((prev) => prev.map((item) => item.id === engagementId ? { ...item, drafts: data.drafts, published: false } : item));
    }
    setBusy(null);
  }

  return (
    <AdminShell>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px 64px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Blueprint FAQ drafts</h1>
        <p style={{ color: "#4b5563", marginTop: 0 }}>Review first, then send to the client for approval. Nothing on this page publishes to a website, and the client is not emailed.</p>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {items.length === 0 && <p style={{ color: "#6b7280" }}>No drafts waiting.</p>}
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((item) => (
            <section key={item.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 }}>
              <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{item.firmName}</h2>
              <p style={{ color: "#6b7280", margin: "0 0 12px", fontSize: 14 }}>{item.contactName} · {item.questionBank} · not published</p>
              <div style={{ display: "grid", gap: 12 }}>
                {item.drafts.map((draft) => (
                  <article key={draft.id} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12 }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{draft.question}</p>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{draft.answer || "No answer yet. Waiting on the client."}</p>
                    <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>Source: {draft.source}. {draft.sourceDetail}</p>
                    <p style={{ margin: "4px 0 8px", fontSize: 13 }}>Status: {label(draft.status)}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {draft.status === "admin_review" && draft.answer && (
                        <button type="button" disabled={busy === draft.id} onClick={() => act(item.id, draft.id, "to_client")} style={btn}>Send to client for approval</button>
                      )}
                      {(draft.status === "client_review" || draft.status === "approved") && (
                        <button type="button" disabled={busy === draft.id} onClick={() => act(item.id, draft.id, "hold")} style={btnGhost}>Hold for another review</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {item.faqPage != null && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer" }}>FAQPage JSON, not published</summary>
                  <pre style={{ overflow: "auto", fontSize: 12, background: "#f8fafc", padding: 12, borderRadius: 8 }}>{JSON.stringify(item.faqPage, null, 2)}</pre>
                </details>
              )}
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function label(status: string): string {
  if (status === "admin_review") return "Waiting for Saabai";
  if (status === "client_review") return "Waiting for the client";
  if (status === "approved") return "Approved, not published";
  return "Needs a client answer";
}

const btn: CSSProperties = { minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "none", background: "#0e0c2e", color: "#fff", cursor: "pointer" };
const btnGhost: CSSProperties = { minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", cursor: "pointer" };
