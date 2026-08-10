"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  tiers,
  additionalServiceWork,
  specialist,
  OWNER_EMAIL,
  type LineItem,
} from "../services";
import { Logo } from "../Logo";

const currency = (n: number) =>
  n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;

function QuoteBuilder() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier") ?? "";
  const initialTier = tiers.some((t) => t.name === tierParam) ? tierParam : "";

  const [tier, setTier] = useState(initialTier);
  const [picked, setPicked] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    suburb: "",
    bike: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const allExtras: LineItem[] = [...specialist, ...additionalServiceWork];
  const selectedTier = tiers.find((t) => t.name === tier);

  const toggle = (label: string) =>
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));

  const { total, hasFrom } = useMemo(() => {
    const chosen = allExtras.filter((s) => picked.includes(s.label));
    return {
      total: (selectedTier?.amount ?? 0) + chosen.reduce((a, s) => a + s.amount, 0),
      hasFrom: chosen.some((s) => s.from),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, selectedTier]);

  const itemCount = (selectedTier ? 1 : 0) + picked.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier && picked.length === 0) {
      setError("Pick a service tier or at least one job before sending.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please add your name and a contact number.");
      return;
    }
    setError("");
    setSending(true);

    const items = allExtras
      .filter((s) => picked.includes(s.label))
      .map((s) => ({ label: s.label, price: s.price }));

    const approxTotal = `${hasFrom ? "from " : ""}${currency(total)}`;

    try {
      const res = await fetch("/api/cycle-repair/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "quote",
          name: form.name,
          email: form.email,
          phone: form.phone,
          suburb: form.suburb,
          bike: form.bike,
          notes: form.notes,
          tier: selectedTier?.name ?? "",
          tierPrice: selectedTier?.price ?? "",
          items,
          approxTotal,
        }),
      });
      if (!res.ok) {
        throw new Error("send failed");
      }
      setSent(true);
    } catch {
      setError(
        `Something went wrong sending your request. Please call 0405 225 721 or email ${OWNER_EMAIL}.`,
      );
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full bg-bg ring-1 ring-white/10 focus:ring-brand rounded-lg px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60";

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-muted-line">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/sites/cycle-repair" className="flex items-center">
            <Logo width={160} height={68} className="h-[58px] sm:h-[68px] w-auto" />
          </Link>
          <a
            href="tel:0405225721"
            className="bg-brand text-brand-foreground px-4 py-2 rounded-md font-semibold text-xs tracking-wide hover:bg-brand/90 transition-colors"
          >
            0405 225 721
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-14 pb-32">
        <Link
          href="/sites/cycle-repair"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-brand transition-colors"
        >
          Back to services
        </Link>
        <h1 className="mt-5 text-4xl md:text-5xl font-display font-semibold tracking-tighter max-w-[20ch]">
          Build your service, then send it to Stu
        </h1>
        <p className="mt-4 text-muted-foreground max-w-[60ch] text-pretty">
          Tick everything you want done. The running total is an approximate labour
          estimate, parts are not included and anything marked &quot;from&quot; is confirmed once
          Stu sees the bike.
        </p>

        {sent ? (
          <div className="mt-12 max-w-xl rounded-2xl bg-surface ring-1 ring-white/10 p-8">
            <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-4">
              Request sent
            </h2>
            <p className="font-display text-2xl font-semibold mb-3">
              Your job sheet is on its way to Stu.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Stu will review the work you have picked and get back to you to confirm
              timing and the final quote. Need to chat sooner? Call{" "}
              <a href="tel:0405225721" className="text-brand hover:underline">
                0405 225 721
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
            <div className="space-y-12">
              {/* Tier */}
              <section>
                <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-5">
                  1. Choose a service tier
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {tiers.map((t) => {
                    const active = tier === t.name;
                    return (
                      <button
                        type="button"
                        key={t.name}
                        onClick={() => setTier(active ? "" : t.name)}
                        className={`text-left p-5 rounded-xl ring-1 transition-colors ${
                          active
                            ? "bg-surface ring-brand"
                            : "bg-bg ring-white/10 hover:ring-brand/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-display font-semibold text-lg">{t.name}</div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {t.tag}
                            </div>
                          </div>
                          <div className="font-display font-semibold text-xl text-brand">
                            {t.price}
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                          {t.items.slice(0, 3).join(", ")} and more.
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <ChecklistSection
                title="2. Specialist work"
                items={specialist}
                picked={picked}
                toggle={toggle}
              />
              <ChecklistSection
                title="3. Additional service work"
                items={additionalServiceWork}
                picked={picked}
                toggle={toggle}
              />

              {/* Details */}
              <section>
                <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-5">
                  4. Your details
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Name
                    </span>
                    <input
                      className={inputClass}
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Phone
                    </span>
                    <input
                      className={inputClass}
                      maxLength={30}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0400 000 000"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Email
                    </span>
                    <input
                      type="email"
                      className={inputClass}
                      maxLength={255}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@email.com"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Suburb
                    </span>
                    <input
                      className={inputClass}
                      maxLength={100}
                      value={form.suburb}
                      onChange={(e) => setForm({ ...form, suburb: e.target.value })}
                      placeholder="Where the bike is"
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Bike make and model
                    </span>
                    <input
                      className={inputClass}
                      maxLength={120}
                      value={form.bike}
                      onChange={(e) => setForm({ ...form, bike: e.target.value })}
                      placeholder="e.g. Giant TCR, Di2"
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                      Anything else Stu should know
                    </span>
                    <textarea
                      rows={4}
                      className={inputClass}
                      maxLength={1000}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Noises, crash damage, preferred days, parts you already have."
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* Basket */}
            <aside className="lg:sticky lg:top-24 rounded-2xl bg-surface ring-1 ring-white/10 p-6">
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-5">
                Your job sheet
              </h2>
              {itemCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing selected yet. Pick a tier or tick the work you need.
                </p>
              ) : (
                <ul className="space-y-2.5 mb-6">
                  {selectedTier && (
                    <li className="flex justify-between gap-4 text-sm">
                      <span className="font-semibold">{selectedTier.name} Service</span>
                      <span className="text-brand whitespace-nowrap">{selectedTier.price}</span>
                    </li>
                  )}
                  {allExtras
                    .filter((s) => picked.includes(s.label))
                    .map((s) => (
                      <li
                        key={s.label}
                        className="flex justify-between gap-4 text-sm text-muted-foreground"
                      >
                        <span>{s.label}</span>
                        <span className="text-brand whitespace-nowrap">{s.price}</span>
                      </li>
                    ))}
                </ul>
              )}
              <div className="border-t border-muted-line pt-4 flex items-end justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Approx. total
                </span>
                <span className="text-3xl font-display font-semibold text-brand">
                  {hasFrom && "from "}
                  {currency(total)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                Labour estimate only. Parts are quoted separately.
              </p>
              {error && <p className="mt-4 text-xs text-brand font-semibold">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="mt-5 w-full bg-brand text-brand-foreground py-3 rounded-lg font-semibold text-sm hover:bg-brand/90 transition-colors disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send request to Stu"}
              </button>
              <a
                href="tel:0405225721"
                className="mt-3 block text-center py-3 rounded-lg font-semibold text-sm ring-1 ring-white/15 hover:ring-brand/60 hover:text-brand transition-colors"
              >
                Or call 0405 225 721
              </a>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}

function ChecklistSection({
  title,
  items,
  picked,
  toggle,
}: {
  title: string;
  items: LineItem[];
  picked: string[];
  toggle: (label: string) => void;
}) {
  return (
    <section>
      <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-5">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-px bg-muted-line border border-muted-line rounded-2xl overflow-hidden">
        {items.map((s) => {
          const active = picked.includes(s.label);
          return (
            <label
              key={s.label}
              className={`flex items-center gap-3 p-4 cursor-pointer text-sm transition-colors ${
                active ? "bg-surface" : "bg-bg hover:bg-surface/50"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(s.label)}
                className="sr-only"
              />
              <span
                className={`size-5 shrink-0 rounded grid place-items-center text-[11px] font-bold ring-2 ${
                  active
                    ? "bg-brand text-brand-foreground ring-brand"
                    : "bg-white/20 text-transparent ring-white/40"
                }`}
              >
                ✓
              </span>
              <span className="flex-1">{s.label}</span>
              <span className="text-brand whitespace-nowrap font-medium">{s.price}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={null}>
      <QuoteBuilder />
    </Suspense>
  );
}
