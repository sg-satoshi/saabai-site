/**
 * Lex demo firm (Harbour & Vale Lawyers): login check and the seed/reset of its fictional data.
 * Node only. Credentials come from env vars only: LEX_DEMO_EMAIL and LEX_DEMO_PASSWORD (plain or scrypt hash).
 * All names, matters and documents below are made up.
 */
import { getRedis } from "./redis";
import { verifyPassword } from "./password";
import { deleteFirmMatters, type Matter, type MatterItem } from "./lex-matters";
import {
  LEX_DEMO_ACTOR_EMAIL, LEX_DEMO_CLIENT_ID, LEX_DEMO_FIRM_KEY, LEX_DEMO_USER_NAME, lexDemoEnabled,
} from "./lex-demo-config";

export * from "./lex-demo-config";

/** Returns the demo clientId when the email and password match the env credentials, else null. */
export async function authenticateLexDemo(rawEmail: string, password: string, env: Record<string, string | undefined> = process.env): Promise<string | null> {
  if (!lexDemoEnabled(env)) return null;
  const want = env.LEX_DEMO_EMAIL!.trim().toLowerCase();
  if ((rawEmail || "").trim().toLowerCase() !== want) return null;
  const res = await verifyPassword(password, env.LEX_DEMO_PASSWORD!.trim());
  return res.ok ? LEX_DEMO_CLIENT_ID : null;
}

const DAY = 86400_000;
const by = LEX_DEMO_ACTOR_EMAIL;

/** Fixed fictional seed. `now` keeps dates fresh on every reset. */
export function lexDemoSeed(now = new Date()): { matters: Matter[]; items: Record<string, MatterItem[]>; threads: unknown[] } {
  const t = now.getTime();
  const y = now.getUTCFullYear();
  const iso = (d: number) => new Date(t + d * DAY).toISOString().slice(0, 10);
  const m = (n: number, f: Omit<Matter, "id" | "createdBy" | "createdAt" | "updatedAt" | "updatedBy" | "itemCount">, age: number, items: number): Matter => ({
    id: `HV-${y}-${String(n).padStart(4, "0")}`, ...f, createdBy: by, createdAt: t - age * DAY, updatedAt: t - Math.floor(age / 3) * DAY, updatedBy: by, itemCount: items,
  });
  const matters = [
    m(1, { name: "Bellbird Family Trust establishment", client: "Marlowe Quill (fictional)", area: "Tax", status: "open", urgency: "high",
      description: "Set up a discretionary family trust with a corporate trustee before 30 June. Fictional demo matter.",
      parties: "Marlowe Quill\nBellbird Nominees Pty Ltd\nJuniper Quill", deadline: iso(9), deadlineLabel: "Deed signed" }, 6, 2),
    m(2, { name: "Fernhill Unit Trust distribution", client: "Fernhill Holdings (fictional)", area: "Tax", status: "open", urgency: "medium",
      description: "Year-end distribution resolution and minutes. Fictional demo matter.", parties: "Fernhill Holdings Pty Ltd\nOrson Pike", deadline: iso(21), deadlineLabel: "Resolution by 30 June" }, 14, 1),
    m(3, { name: "Lyrebird Cafe lease review", client: "Tamsin Ardent (fictional)", area: "Property", status: "on_hold", urgency: "low",
      description: "Retail shop lease, waiting on the landlord's disclosure statement. Fictional demo matter.", parties: "Tamsin Ardent\nCoastline Retail Pty Ltd", deadline: null, deadlineLabel: "" }, 30, 0),
  ];
  const deed = [
    "DISCRETIONARY TRUST DEED: BELLBIRD FAMILY TRUST",
    "DEMO DOCUMENT. FICTIONAL PARTIES. NOT LEGAL ADVICE.",
    "",
    "1. Parties. This deed is made by Marlowe Quill (Settlor) and Bellbird Nominees Pty Ltd (Trustee).",
    "2. Settlement. The Settlor pays the Trustee $10 to hold on the trusts of this deed.",
    "3. Name. The trust is called the Bellbird Family Trust.",
    "4. Beneficiaries. The Primary Beneficiaries are Marlowe Quill and Juniper Quill. General Beneficiaries include their relatives and any company or trust in which a Primary Beneficiary has an interest.",
    "5. Income. For each income year the Trustee may, by resolution made on or before 30 June, distribute the net income of the trust to one or more beneficiaries.",
    "6. Vesting. The Vesting Day is the day before the 80th anniversary of this deed, or an earlier day the Trustee chooses.",
    "7. Appointor. The Appointor is Marlowe Quill.",
    "8. Governing law. Queensland.",
  ].join("\n");
  const research = [
    { role: "user", content: "What are the requirements for a valid trust distribution resolution in Queensland before 30 June?", at: t - 5 * DAY },
    { role: "assistant", content: "Demo answer (fictional matter). A trustee should make the resolution by 30 June, in the form the deed requires, and record it in writing. Check the deed's income definition and any streaming clauses before drafting.", at: t - 5 * DAY + 60_000 },
  ];
  const items: Record<string, MatterItem[]> = {
    [matters[0].id]: [
      { ref: "draft-bellbird-deed", kind: "draft", title: "Discretionary trust deed (Bellbird Family Trust)", by, at: t - 2 * DAY, data: { text: deed, docType: "discretionary-trust-deed" } },
      { ref: "research-bellbird-1", kind: "research", title: "Trust distribution resolution timing", by, at: t - 5 * DAY, data: { messages: research } },
    ],
    [matters[1].id]: [
      { ref: "research-fernhill-1", kind: "research", title: "Unit trust distribution resolution timing", by, at: t - 10 * DAY, data: { messages: research } },
    ],
  };
  const threads = [
    { id: "demo-thread-1", title: "Trust distribution resolution timing", createdAt: t - 5 * DAY, matterId: matters[0].id, messages: research },
    { id: "demo-thread-2", title: "Corporate trustee: director ID requirements", createdAt: t - 3 * DAY, messages: [
      { role: "user", content: "Does each director of a corporate trustee need a director ID?", at: t - 3 * DAY },
      { role: "assistant", content: "Demo answer (fictional). Generally yes. Each director needs a director ID; check the current ABRS rules before appointment.", at: t - 3 * DAY + 45_000 },
    ] },
  ];
  return { matters, items, threads };
}

/** Wipes everything under the demo firm key and the demo user's threads, then writes the seed. Touches demo keys only. */
export async function resetLexDemo(now = new Date()): Promise<{ matters: number; items: number; threads: number }> {
  const redis = getRedis();
  if (!redis) throw new Error("redis_unavailable");
  await deleteFirmMatters(LEX_DEMO_FIRM_KEY);
  const seed = lexDemoSeed(now);
  await redis.hset(`lex:matters:${LEX_DEMO_FIRM_KEY}`, Object.fromEntries(seed.matters.map((m) => [m.id, JSON.stringify(m)])));
  let items = 0;
  for (const [id, list] of Object.entries(seed.items)) {
    await redis.hset(`lex:matter:items:${LEX_DEMO_FIRM_KEY}:${id}`, Object.fromEntries(list.map((i) => [i.ref, JSON.stringify(i)])));
    items += list.length;
  }
  await redis.set(`lex:threads:${LEX_DEMO_ACTOR_EMAIL}`, JSON.stringify(seed.threads), { ex: 90 * 86400 });
  return { matters: seed.matters.length, items, threads: seed.threads.length };
}

export const LEX_DEMO_DISPLAY = { name: LEX_DEMO_USER_NAME };
