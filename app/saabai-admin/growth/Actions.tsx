"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { confirmDialog, notify } from "../ui/Feedback";

export function ActionButton({ url, body, label, variant, confirm, done }: { url: string; body: Record<string, unknown>; label: string; variant?: "pri" | "acc" | "gh" | "dg"; confirm?: string; done?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button size="sm" variant={variant} disabled={busy} onClick={async () => {
      if (confirm && !(await confirmDialog(confirm, { confirmLabel: label }))) return;
      setBusy(true);
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Something went wrong");
        if (d.url) { await navigator.clipboard?.writeText(d.url).catch(() => null); notify.success(`Link ready: ${d.url} (copied)`); }
        else notify.success(done || "Done");
        router.refresh();
      } catch (e) { notify.error((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Working..." : label}</Button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return <Button size="sm" variant="gh" onClick={async () => { try { await navigator.clipboard.writeText(text); notify.success("Copied"); } catch { notify.error("Couldn't copy"); } }}>{label}</Button>;
}

export function NewReferralForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="gr-form">
      <input type="email" placeholder="Client email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Client email" />
      <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Client name" />
      <ActionButton url="/api/admin/growth/referrals" body={{ action: "create", email, name }} label="Create link" variant="pri" />
    </div>
  );
}
