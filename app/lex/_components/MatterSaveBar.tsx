"use client";
import { DOCS_FLOW_COPY } from "../../../lib/lex-docs-flow";

export type MatterSaveState = "saving" | "saved" | "error" | undefined;

/** Button label for each save state. "Saved to matter" only after the server confirmed the save. */
export function matterSaveLabel(state: MatterSaveState): string {
  return state === "saving" ? DOCS_FLOW_COPY.savingToMatter : state === "saved" ? DOCS_FLOW_COPY.savedToMatter : DOCS_FLOW_COPY.saveToMatter;
}

/** Explicit Save to matter for a finished draft or review. Nothing is saved to the matter until pressed. */
export function MatterSaveBar(p: { show: boolean; state: MatterSaveState; notice: string; note: string; onSave: () => void }) {
  return (
    <div className="lx-matter-save" data-testid="matter-save" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 13 }}>
      {p.show ? (
        <>
          <button type="button" className="lx-btn sm" onClick={p.onSave} disabled={p.state === "saving" || p.state === "saved"} aria-busy={p.state === "saving"}>
            {matterSaveLabel(p.state)}
          </button>
          <span>{p.notice}</span>
          {p.state === "error" ? <span role="alert">{DOCS_FLOW_COPY.matterSaveError}</span> : null}
        </>
      ) : (
        <span>{p.note}</span>
      )}
    </div>
  );
}
