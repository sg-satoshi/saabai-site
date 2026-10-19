"use client";

import { useMemo, useState } from "react";
import { PRODUCT_TARGETS, searchProductTargets } from "@/lib/coupons/core";

interface Status { id: string; ready: boolean; note?: string }

/**
 * "Works on" control for coupons: All products, or a hand-picked set of products
 * (search, select all, clear, chips). `value` is the selected target ids; an empty
 * list with mode "all" means every product.
 */
export default function ProductPicker({ mode, value, statuses, onChange }: {
  mode: "all" | "selected";
  value: string[];
  statuses: Status[];
  onChange: (mode: "all" | "selected", value: string[]) => void;
}) {
  const [q, setQ] = useState("");
  // Remember the selection while "All products" is on, so switching back restores it.
  const [stash, setStash] = useState<string[]>([]);
  const ready = (id: string) => !!statuses.find((s) => s.id === id)?.ready;
  const visible = useMemo(() => searchProductTargets(q), [q]);
  const readyIds = PRODUCT_TARGETS.map((t) => t.id).filter(ready);
  const toggle = (id: string) => onChange("selected", value.includes(id) ? value.filter((v) => v !== id) : PRODUCT_TARGETS.map((t) => t.id).filter((x) => x === id || value.includes(x)));
  const label = (id: string) => PRODUCT_TARGETS.find((t) => t.id === id)?.label ?? id;

  return (
    <div className="of-f">
      <span className="lb" id="of-works-lb">Works on</span>
      <div className="of-seg" role="group" aria-labelledby="of-works-lb">
        <button type="button" className={mode === "all" ? "on" : ""} onClick={() => { if (value.length) setStash(value); onChange("all", []); }}>All products</button>
        <button type="button" className={mode === "selected" ? "on" : ""} onClick={() => onChange("selected", value.length ? value : stash)}>Choose products</button>
      </div>
      {mode === "selected" && (
        <div className="of-pick">
          {value.length > 0 && (
            <div className="of-chips" aria-label="Selected products">
              {value.map((id) => (
                <span className="of-chip" key={id}>
                  {label(id)}
                  <button type="button" aria-label={`Remove ${label(id)}`} onClick={() => toggle(id)}>×</button>
                </span>
              ))}
            </div>
          )}
          <input aria-label="Search products" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
          <div className="of-pick-acts">
            <button type="button" onClick={() => onChange("selected", readyIds)} disabled={!readyIds.length}>Select all Blueprint ({readyIds.length})</button>
            <button type="button" onClick={() => onChange("selected", [])} disabled={!value.length}>Clear</button>
            <span className="muted">{value.length} selected</span>
          </div>
          <div className="of-list" role="group" aria-label="Products">
            {visible.length === 0 && <p className="hint">No products match.</p>}
            {visible.map((t) => {
              const ok = ready(t.id);
              return (
                <label key={t.id} className={`of-opt${ok ? "" : " off"}`}>
                  <input type="checkbox" checked={value.includes(t.id)} disabled={!ok} onChange={() => toggle(t.id)} />
                  <span>{t.label}{!ok && <em> (set up coupon products first)</em>}</span>
                </label>
              );
            })}
          </div>
          {value.length === 0 && <p className="hint">Pick at least one product, or switch to All products.</p>}
        </div>
      )}
    </div>
  );
}
