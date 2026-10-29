"use client";
import { DOCS_FLOW_COPY } from "../../../lib/lex-docs-flow";

/** Explicit Save to matter for a finished draft or review. Nothing is saved to the matter until pressed. */
export function MatterSaveBar(p: { show: boolean; saved: boolean; notice: string; note: string; onSave: () => void }) {
  return (
    <div className="lx-matter-save" data-testid="matter-save" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 13 }}>
      {p.show ? (
        <>
          <button type="button" className="lx-btn sm" onClick={p.onSave} disabled={p.saved}>
            {p.saved ? DOCS_FLOW_COPY.savedToMatter : DOCS_FLOW_COPY.saveToMatter}
          </button>
          <span>{p.notice}</span>
        </>
      ) : (
        <span>{p.note}</span>
      )}
    </div>
  );
}
