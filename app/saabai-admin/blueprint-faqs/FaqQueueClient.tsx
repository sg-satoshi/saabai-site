"use client";

/**
 * Admin review queue. Sending a draft to the client only changes its status.
 * It does not email them and it does not publish the FAQ.
 */

import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);

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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
    <>
      <div className="mc-head">
        <div>
          <h1 className="mc-h1">Blueprint FAQs</h1>
          <p className="mc-sub">Review first, then send to the client for approval. Nothing on this page publishes to a website, and the client is not emailed.</p>
        </div>
      </div>

      {error && <p role="alert" style={{ color: "var(--bad)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {!loading && items.length === 0 && !error && (
        <div className="card">
          <div className="bd" style={{ textAlign: "center" }}>
            <p className="muted" style={{ margin: 0 }}>No drafts waiting.</p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((item) => (
          <section key={item.id} className="card" aria-labelledby={`faq-firm-${item.id}`}>
            <div className="hd" style={{ flexWrap: "wrap", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <h2 id={`faq-firm-${item.id}`} style={{ margin: 0 }}>{item.firmName}</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{item.contactName} · {item.questionBank}</p>
              </div>
              <span className="badge b-n">Not published</span>
            </div>
            <div className="bd" style={{ display: "grid", gap: 12 }}>
              {item.drafts.map((draft) => {
                const badge = statusBadge(draft.status);
                return (
                  <article key={draft.id} aria-busy={busy === draft.id} style={{ border: "1px solid var(--n-200)", borderRadius: 12, padding: 14, background: "var(--n-25)" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 650 }}>{draft.question}</p>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{draft.answer || "No answer yet. Waiting on the client."}</p>
                    <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>Source: {draft.source}. {draft.sourceDetail}</p>
                    <p style={{ margin: "8px 0" }}><span className={`badge ${badge.cls}`}>{badge.text}</span></p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {draft.status === "admin_review" && draft.answer && (
                        <button type="button" className={`btn pri${busy === draft.id ? " loading" : ""}`} disabled={busy === draft.id} onClick={() => act(item.id, draft.id, "to_client")}>Send to client for approval</button>
                      )}
                      {(draft.status === "client_review" || draft.status === "approved") && (
                        <button type="button" className="btn" disabled={busy === draft.id} onClick={() => act(item.id, draft.id, "hold")}>Hold for another review</button>
                      )}
                    </div>
                  </article>
                );
              })}
              {item.faqPage != null && (
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>FAQPage JSON, not published</summary>
                  <pre className="num" style={{ overflow: "auto", fontSize: 12, background: "var(--n-25)", border: "1px solid var(--n-200)", padding: 12, borderRadius: 8, margin: "8px 0 0" }}>{JSON.stringify(item.faqPage, null, 2)}</pre>
                </details>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function statusBadge(status: string): { cls: string; text: string } {
  if (status === "admin_review") return { cls: "b-warn", text: "Waiting for Saabai" };
  if (status === "client_review") return { cls: "b-info", text: "Waiting for the client" };
  if (status === "approved") return { cls: "b-ok", text: "Approved, not published" };
  return { cls: "b-n", text: "Needs a client answer" };
}
