import { requireAdmin } from "@/lib/require-admin";
import AdminShell from "../AdminSidebar";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { EVENT_LABELS, contactKey, listContactEvents, listEventsSince, type ContactEvent, type ContactRecord } from "@/lib/growth/events";
import { getDoc } from "@/lib/growth/store";
import { touchLabel } from "@/lib/growth/attribution";
import "./journey.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journey" };

const STAGES: { type: ContactEvent["type"]; label: string }[] = [
  { type: "score_taken", label: "Score" },
  { type: "blueprint_purchased", label: "Blueprint" },
  { type: "report_delivered", label: "Delivered" },
  { type: "upsell_sent", label: "Upsell" },
  { type: "care_plan_started", label: "Care plan" },
];
const TONE: Partial<Record<ContactEvent["type"], string>> = {
  payment_failed: "bad", care_plan_cancelled: "bad", unsubscribed: "warn", blueprint_purchased: "ok", care_plan_started: "ok", payment: "ok", report_delivered: "info",
};
const fmt = (iso: string) => new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const money = (c?: number) => (c == null ? "" : `$${(c / 100).toLocaleString("en-AU", { maximumFractionDigits: 2 })}`);

async function recentContacts(): Promise<ContactEvent[]> {
  const seen = new Set<string>();
  const out: ContactEvent[] = [];
  for (const e of await listEventsSince(Date.now() - 90 * 864e5, undefined, 500)) {
    if (seen.has(e.contactId)) continue;
    seen.add(e.contactId);
    out.push(e);
    if (out.length >= 25) break;
  }
  return out;
}

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  await requireAdmin("/saabai-admin/journey");
  const email = contactKey((await searchParams).email ?? "");
  let events: ContactEvent[] = [];
  let contact: ContactRecord | null = null;
  let recent: { contactId: string; type: ContactEvent["type"]; occurredAt: string }[] = [];
  let err = "";
  try {
    if (email) [events, contact] = await Promise.all([listContactEvents(email), getDoc<ContactRecord>("contacts", email)]);
    else {
      recent = await recentContacts();
    }
  } catch { err = "Couldn't load journey data. Try again shortly."; recent = []; }
  const reached = new Set(events.map((e) => e.type));

  return (
    <AdminShell activePath="/saabai-admin/journey">
      <div className="pg jn">
        <div className="ph">
          <div>
            <div className="crumb">Clients / <b>Journey</b></div>
            <h1>{email ? contact?.name || email : "Contact journeys"}</h1>
            <p className="sub">{email ? email : "Every step from free score to care plan, newest first."}</p>
          </div>
        </div>
        <form className="jn-search" action="/saabai-admin/journey">
          <input name="email" type="email" defaultValue={email} placeholder="Find a contact by email" aria-label="Contact email" />
          <button className="btn pri" type="submit">Open</button>
        </form>
        {err && <Card><CardBody><p className="muted">{err}</p></CardBody></Card>}

        {email && !err && (
          <>
            <div className="jn-stages" aria-label="Journey stages">
              {STAGES.map((s) => <div key={s.type} className={reached.has(s.type) ? "on" : ""}><span />{s.label}</div>)}
            </div>
            <div className="jn-src">
              <Card><CardBody><p className="muted">First touch</p><b>{touchLabel(contact?.firstTouch)}</b>{contact?.firstTouch?.p && <p className="muted">Landed on {contact.firstTouch.p}</p>}</CardBody></Card>
              <Card><CardBody><p className="muted">Latest touch</p><b>{touchLabel(contact?.lastTouch)}</b>{contact?.lastTouch?.t && <p className="muted">{fmt(new Date(contact.lastTouch.t).toISOString())}</p>}</CardBody></Card>
            </div>
            <Card>
              <CardHeader title={`Timeline (${events.length})`} />
              {!events.length && <CardBody><p className="muted">No events for this contact yet. Events start recording from this release; earlier history isn&apos;t backfilled.</p></CardBody>}
              <ol className="jn-tl">
                {events.map((e) => (
                  <li key={e.id}>
                    <div className="jn-dot" data-tone={TONE[e.type] ?? "n"} />
                    <div className="jn-body">
                      <div className="jn-r1"><b>{EVENT_LABELS[e.type] ?? e.type}</b>{e.amountCents != null && <span className="num">{money(e.amountCents)}</span>}</div>
                      <div className="muted jn-meta">
                        {fmt(e.occurredAt)} AEST
                        {typeof e.meta?.tier === "string" && <> · {e.meta.tier}</>}
                        {typeof e.meta?.score === "number" && <> · scored {e.meta.score}</>}
                        {!!e.meta?.source && <> · via {touchLabel(e.meta.source as never)}</>}
                      </div>
                    </div>
                    {TONE[e.type] === "bad" && <Badge tone="bad">Needs attention</Badge>}
                  </li>
                ))}
              </ol>
            </Card>
          </>
        )}

        {!email && !err && (
          <Card>
            <CardHeader title="Recent activity" />
            {!recent.length && <CardBody><p className="muted">No journey events yet. They start with the next /score, Blueprint purchase or care plan payment.</p></CardBody>}
            {recent.map((e) => (
              <a className="oc jn-row" key={e.contactId} href={`/saabai-admin/journey?email=${encodeURIComponent(e.contactId)}`}>
                <div className="r1"><b>{e.contactId}</b><span className="muted">{fmt(e.occurredAt)}</span></div>
                <div className="muted">{EVENT_LABELS[e.type] ?? e.type}</div>
              </a>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
