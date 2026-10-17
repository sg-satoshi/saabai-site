"use client";
import { useEffect, useState } from "react";
import AnnouncementView from "../../../components/AnnouncementView";
import type { PublicAnnouncement } from "../../../../lib/announce/core";

type Msg = { type: "ann-preview"; ann: PublicAnnouncement | null; ended: boolean };

/**
 * The real announcement component over a stand-in page. It only listens to the admin page (same origin) and never fetches,
 * stores or tracks anything, so it cannot affect the live announcement or any visitor.
 */
export default function PreviewFrame() {
  const [state, setState] = useState<{ ann: PublicAnnouncement | null; ended: boolean }>({ ann: null, ended: false });
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as Msg;
      if (d && d.type === "ann-preview") setState({ ann: d.ann, ended: !!d.ended });
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "ann-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  const top = state.ann?.layout === "top";
  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f9", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ height: 56, background: "#0b092e", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", color: "#fff", fontWeight: 600 }}>
        <span>saabai.ai</span><span style={{ fontSize: 13, color: "#c9cde8" }}>Preview only</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ height: 18, width: "55%", background: "#dfe2ea", borderRadius: 6, marginBottom: 10 }} />
        <div style={{ height: 12, width: "80%", background: "#eceef4", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 12, width: "70%", background: "#eceef4", borderRadius: 6 }} />
      </div>
      {state.ann ? <AnnouncementView ann={state.ann} ended={state.ended} offset={0} onClose={() => setState((s) => ({ ...s, ann: null }))} preview /> : <p style={{ textAlign: "center", color: "#4e546c", fontSize: 13 }}>{top ? "" : "The bar is hidden in this state."}</p>}
    </div>
  );
}
