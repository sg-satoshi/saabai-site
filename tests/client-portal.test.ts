/**
 * Client portal logic tests (magic link, requests store, validation, emails).
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_CLIENT_1_ID = "envclient";
  process.env.SAABAI_CLIENT_1_NAME = "Env Client";
  process.env.SAABAI_CLIENT_1_EMAIL = "env@client.test";
  process.env.SAABAI_CLIENT_1_PASSWORD = "x";
  delete process.env.RESEND_API_KEY;

  mock.seed({
    hashes: {
      "saabai:users": {
        "stu@cycle.test": { id: "stu-cycle-test", name: "Stu Smith", email: "stu@cycle.test", password: "p", role: "user", dashboardUrl: "/dashboard", approvedAt: "", createdAt: "" },
        "boss@saabai.test": { id: "boss-saabai-test", name: "Boss", email: "boss@saabai.test", password: "p", role: "admin", dashboardUrl: "/saabai-admin", approvedAt: "", createdAt: "" },
      },
    },
  });
});

after(() => new Promise<void>((r) => mock.server.close(() => r())));

const BLOB = "https://abc123.public.blob.vercel-storage.com";

// ── safeRedirect ──────────────────────────────────────────────────────────
test("safeRedirect only allows same-origin relative paths", async () => {
  const { safeRedirect } = await import("../lib/safe-redirect");
  assert.equal(safeRedirect("/dashboard/requests?x=1#a"), "/dashboard/requests?x=1#a");
  assert.equal(safeRedirect("/saabai-admin"), "/saabai-admin");
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "javascript:alert(1)", "/\t/evil.com", "evil.com", "", null, 42, "/o\nk", "/a b"]) {
    assert.equal(safeRedirect(bad, "/fallback"), "/fallback", `should reject ${JSON.stringify(bad)}`);
  }
});

// ── validation ────────────────────────────────────────────────────────────
test("validateNewRequest enforces fields, priority and screenshot rules", async () => {
  const { validateNewRequest, blobFolderFor } = await import("../lib/client-requests");
  const id = "stu-cycle-test";
  const own = (n: number) => `${BLOB}/${blobFolderFor(id)}/shot-${n}-AbC.png`;

  assert.equal(validateNewRequest({ title: "", description: "long enough text" }, id).ok, false);
  assert.equal(validateNewRequest({ title: "Fix it", description: "short" }, id).ok, false);
  assert.equal(validateNewRequest({ title: "Fix it", description: "long enough text", priority: "asap" }, id).ok, false);
  assert.equal(validateNewRequest({ title: "Fix it", description: "long enough text", screenshots: [own(1), own(2), own(3), own(4)] }, id).ok, false);
  assert.equal(validateNewRequest({ title: "Fix it", description: "long enough text", screenshots: ["https://evil.com/x.png"] }, id).ok, false);
  // another client's folder is rejected
  assert.equal(validateNewRequest({ title: "Fix it", description: "long enough text", screenshots: [`${BLOB}/${blobFolderFor("other")}/x.png`] }, id).ok, false);
  assert.equal(validateNewRequest({ title: "Fix it", description: "long enough text", screenshots: [`http://abc.public.blob.vercel-storage.com/${blobFolderFor(id)}/x.png`] }, id).ok, false);

  const ok = validateNewRequest({ title: "  Update hours  ", description: "Please change Saturday hours to 8-12.", priority: "high", screenshots: [own(1)] }, id);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.title, "Update hours");
    assert.equal(ok.value.priority, "high");
    assert.deepEqual(ok.value.screenshots, [own(1)]);
  }
  const def = validateNewRequest({ title: "Update hours", description: "Please change Saturday hours." }, id);
  assert.ok(def.ok && def.value.priority === "normal");
});

// ── requests store ────────────────────────────────────────────────────────
test("requests are scoped per client and status updates are tracked", async () => {
  const { createRequest, listRequests, updateRequest, getRequest } = await import("../lib/client-requests");
  const base = { description: "Please do the thing on the site.", priority: "normal" as const, screenshots: [] };
  const a1 = await createRequest({ ...base, clientId: "client-a", clientName: "A", clientEmail: "a@a.test", title: "A one" });
  await new Promise((r) => setTimeout(r, 5));
  const a2 = await createRequest({ ...base, clientId: "client-a", clientName: "A", clientEmail: "a@a.test", title: "A two" });
  const b1 = await createRequest({ ...base, clientId: "client-b", clientName: "B", clientEmail: "b@b.test", title: "B one" });

  assert.equal(a1.status, "received");
  const mine = await listRequests({ clientId: "client-a" });
  assert.deepEqual(mine.map((r) => r.id), [a2.id, a1.id], "newest first, only client A");
  assert.ok(!(await listRequests({ clientId: "client-b" })).some((r) => r.clientId !== "client-b"));
  assert.equal((await listRequests()).length >= 3, true);

  const upd = await updateRequest(a1.id, { status: "in_progress", adminNote: "  On it  " });
  assert.ok(!("error" in upd));
  if (!("error" in upd)) {
    assert.equal(upd.statusChanged, true);
    assert.equal(upd.request.adminNote, "On it");
  }
  const same = await updateRequest(a1.id, { status: "in_progress", adminNote: "" });
  assert.ok(!("error" in same) && same.statusChanged === false && same.request.adminNote === undefined);

  assert.deepEqual((await listRequests({ status: "in_progress" })).map((r) => r.id), [a1.id]);
  const bad = await updateRequest(b1.id, { status: "deleted" });
  assert.ok("error" in bad && bad.code === 400);
  const missing = await updateRequest("nope", { status: "done" });
  assert.ok("error" in missing && missing.code === 404);
  assert.equal((await getRequest(b1.id))?.status, "received", "invalid update leaves record untouched");
});

// ── magic link ────────────────────────────────────────────────────────────
test("only client accounts are eligible for magic links (admins and unknown emails excluded)", async () => {
  const { findEligibleClient } = await import("../lib/client-magic-link");
  assert.equal((await findEligibleClient("STU@cycle.test "))?.clientId, "stu-cycle-test");
  assert.equal((await findEligibleClient("env@client.test"))?.clientId, "envclient");
  assert.equal(await findEligibleClient("boss@saabai.test"), null);
  assert.equal(await findEligibleClient("nobody@nowhere.test"), null);
  assert.equal(await findEligibleClient("not-an-email"), null);
});

test("magic link tokens are random, hashed at rest, single-use, 15-minute expiry, safe redirect", async () => {
  const { createMagicLink, consumeMagicLink, hashToken, MAGIC_LINK_TTL_SECONDS } = await import("../lib/client-magic-link");
  const client = { clientId: "stu-cycle-test", name: "Stu", email: "stu@cycle.test" };

  const t1 = await createMagicLink(client, "//evil.com/steal");
  const t2 = await createMagicLink(client, "/dashboard/requests");
  assert.ok(t1 && t2 && t1 !== t2);
  assert.ok(t1!.length >= 43, "256-bit base64url token");

  const keys: string[] = mock.exec(["KEYS", "client:magic:token:*"]);
  assert.ok(!keys.some((k) => k.includes(t1!)), "raw token never stored");
  assert.ok(keys.includes(`client:magic:token:${hashToken(t1!)}`));
  const ttl = mock.exec(["TTL", `client:magic:token:${hashToken(t1!)}`]);
  assert.ok(ttl > 0 && ttl <= MAGIC_LINK_TTL_SECONDS);

  const r1 = await consumeMagicLink(t1);
  assert.equal(r1?.clientId, "stu-cycle-test");
  assert.equal(r1?.redirect, "/dashboard", "unsafe redirect replaced");
  assert.equal(await consumeMagicLink(t1), null, "second use rejected");
  assert.equal((await consumeMagicLink(t2))?.redirect, "/dashboard/requests");
  assert.equal(await consumeMagicLink("garbage-token-that-does-not-exist"), null);
  assert.equal(await consumeMagicLink(undefined), null);
});

test("processMagicLinkRequest issues tokens only for eligible emails and rate-limits", async () => {
  const { processMagicLinkRequest } = await import("../lib/client-magic-link");
  mock.exec(["DEL", ...(mock.exec(["KEYS", "client:magic:*"]) as string[])]);
  const count = () => (mock.exec(["KEYS", "client:magic:token:*"]) as string[]).length;
  const origLog = console.log;
  console.log = () => {};
  try {
    await processMagicLinkRequest("nobody@nowhere.test", "/dashboard");
    await processMagicLinkRequest("boss@saabai.test", "/saabai-admin");
    assert.equal(count(), 0, "no tokens for unknown/admin emails");
    for (let i = 0; i < 7; i++) await processMagicLinkRequest("stu@cycle.test", "/dashboard");
    assert.equal(count(), 5, "max 5 links per 15 minutes");
  } finally {
    console.log = origLog;
  }
});

// ── emails ────────────────────────────────────────────────────────────────
test("request emails escape client-supplied content and stay polite", async () => {
  const { buildNewRequestEmail, buildStatusEmail } = await import("../lib/client-request-emails");
  const r = {
    id: "1", clientId: "c", clientName: "Stu <b>Smith</b>", clientEmail: "stu@cycle.test",
    title: "<script>alert(1)</script>", description: "line1\n<img src=x onerror=alert(1)>",
    priority: "high" as const, screenshots: [], status: "done" as const, adminNote: "All done <3",
    createdAt: "", updatedAt: "",
  };
  const n = buildNewRequestEmail(r);
  assert.ok(!n.html.includes("<script>") && n.html.includes("&lt;script&gt;"));
  assert.ok(!n.html.includes("<img src=x"));
  const s = buildStatusEmail(r);
  assert.ok(s.html.includes("Good news") && s.html.includes("Thanks so much") && s.html.includes("All done &lt;3"));
  assert.ok(!s.html.includes("<b>Smith"));
  assert.ok(!/\u2014/.test(s.html + n.html), "no em dashes");
});
