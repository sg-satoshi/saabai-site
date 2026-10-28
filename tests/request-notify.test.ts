/**
 * Client request notify rules, status email text, and the admin panel bugs
 * from issue 315. Redis tests use the in-memory Upstash mock. No email is sent.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import {
  notifyClientDefault,
  shouldEmailStatus,
  statusEmailFirstLine,
  statusLabel,
  statusLeadPlain,
  statusTimelineLine,
} from "../lib/request-notify";

const mock = createMockUpstash();

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  delete process.env.RESEND_API_KEY;
});

after(() => new Promise<void>((r) => mock.server.close(() => r())));

const TITLE = "Phone number wrong on homepage";

test("internal statuses default the client email off, client-facing ones default on", () => {
  for (const status of ["triaged", "qa", "blocked"]) {
    assert.equal(notifyClientDefault(status), false, status);
    assert.equal(shouldEmailStatus(status, undefined), false, status);
  }
  for (const status of ["new", "awaiting_client", "in_progress", "done"]) {
    assert.equal(notifyClientDefault(status), true, status);
    assert.equal(shouldEmailStatus(status, undefined), true, status);
  }
  assert.equal(shouldEmailStatus("qa", false), false);
  assert.equal(shouldEmailStatus("qa", true), true);
  assert.equal(shouldEmailStatus("done", false), false);
  assert.equal(shouldEmailStatus("done", true), true);
});

test("status email preview matches the first line buildStatusEmail sends", async () => {
  assert.equal(
    statusEmailFirstLine("done", TITLE, "Sam Example"),
    `Hi Sam, good news, your request "${TITLE}" is done.`,
  );
  assert.equal(statusLeadPlain("in_progress", TITLE), `quick update: work has started on "${TITLE}".`);
  assert.equal(statusLeadPlain("qa", TITLE), `your request "${TITLE}" is now marked as qa / review.`);
  assert.equal(statusTimelineLine("in_progress", "done", false), "Status: In progress → Done · Client not emailed");
  assert.equal(statusLabel("qa"), "QA / Review");

  const { buildStatusEmail } = await import("../lib/client-request-emails");
  const email = buildStatusEmail({
    id: "1",
    clientId: "c",
    clientName: "Sam Example",
    clientEmail: "sam@example.com",
    title: TITLE,
    description: "Old number",
    type: "other",
    priority: "high",
    screenshots: [],
    status: "done",
    autoHandle: true,
    discussWithShane: false,
    clarifierRounds: 0,
    timeline: [],
    adminNote: "secret internal note",
    createdAt: "",
    updatedAt: "",
  });
  assert.ok(email.html.includes("Good news"));
  assert.ok(email.html.includes("Thanks so much"));
  assert.ok((email.text || "").includes(statusLeadPlain("done", TITLE)));
  assert.ok(!email.html.includes("secret internal note"));
  assert.ok(!(email.text || "").includes("secret internal note"));
  assert.ok(!/\u2014/.test(email.html + (email.text || "")), "no em dashes");
});

test("a status save does not take over a critical ticket, and the log line records the email choice", async () => {
  const { createRequest, updateRequest, annotateStatusEmail } = await import("../lib/client-requests");
  const base = {
    description: "Please change the number in the header.",
    type: "other" as const,
    screenshots: [] as string[],
    clientId: "client-n",
    clientName: "Sam Example",
    clientEmail: "sam@example.com",
  };
  const critical = await createRequest({ ...base, title: TITLE, priority: "critical" });
  assert.equal(critical.discussWithShane, false);
  assert.equal(critical.assignee, "chief_ai");

  const saved = await updateRequest(critical.id, { status: "in_progress" });
  assert.ok(!("error" in saved));
  if ("error" in saved) return;
  assert.equal(saved.statusChanged, true);
  assert.equal(saved.request.discussWithShane, false);
  assert.equal(saved.request.autoHandle, true);
  assert.equal(saved.request.assignee, "chief_ai");
  assert.equal(saved.request.adminNote, undefined);

  const noted = await annotateStatusEmail(critical.id, "new", "in_progress", false, "Alex Admin <alex@saabai.ai>");
  assert.ok(noted);
  const lines = noted!.timeline.filter((t) => t.kind === "status");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].body, "Status: New → In progress · Client not emailed");
  assert.equal(lines[0].authorName, "Alex Admin <alex@saabai.ai>");

  const taken = await updateRequest(critical.id, {
    discussWithShane: true,
    autoHandle: false,
    assignee: "shane",
  });
  assert.ok(!("error" in taken) && taken.statusChanged === false);
  if (!("error" in taken)) {
    assert.equal(taken.request.discussWithShane, true);
    assert.equal(taken.request.assignee, "shane");
    assert.equal(taken.request.status, "in_progress");
  }
});

test("admin requests route and panel keep the notify, author, and close behaviour", () => {
  const route = readFileSync("app/api/admin/requests/[id]/route.ts", "utf8");
  const panel = readFileSync("app/saabai-admin/requests/RequestsAdminClient.tsx", "utf8");
  const layout = readFileSync("app/saabai-admin/layout.tsx", "utf8");
  const globals = readFileSync("app/globals.css", "utf8");

  assert.match(route, /authorName: await actorLabel\(\)/);
  assert.doesNotMatch(route, /authorName:.*\|\| "Shane"|authorName: "Shane"/);
  const statusBlock = route.slice(route.indexOf("if (statusChanged)"));
  assert.match(statusBlock, /shouldEmailStatus/);
  const afterChoice = statusBlock.split("shouldEmailStatus")[1] || "";
  assert.match(afterChoice, /adminNote: undefined/);
  assert.match(afterChoice, /addChangeLogEntry/);
  assert.match(afterChoice, /annotateStatusEmail/);

  assert.match(panel, /patch\(\{ status: pending, notifyClient: notify \}, "status"\)/);
  assert.match(panel, /Close panel/);
  assert.match(panel, /Hand back to Chief/);
  assert.match(panel, /Email the client about this change/);
  assert.match(panel, /label: "QA"/);
  assert.match(panel, /label: "Blocked"/);
  assert.match(panel, /if \(narrow\(\)\) router\.push\(next\)/);
  assert.doesNotMatch(panel, /Escalate to Shane/);
  assert.doesNotMatch(panel, /\u2014/);

  const effects = [...panel.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[[^\]]*\]\);/g)].map((m) => m[1]);
  assert.ok(effects.length >= 3);
  for (const body of effects) {
    assert.doesNotMatch(body, /discussWithShane|method: "PATCH"|takeOver/);
  }

  assert.match(layout, /geist-latin-wght-normal\.woff2/);
  assert.match(layout, /--font-admin-sans/);
  assert.doesNotMatch(layout, /Inter/);
  assert.match(globals, /font-family:\s*"Inter"/);
});
