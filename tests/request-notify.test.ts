/**
 * Client request notify rules, status email text, and the admin panel bugs
 * from issue 315. Redis tests use the in-memory Upstash mock. No email is sent.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { toClientView } from "../lib/client-requests";
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

  const publicId = saved.request.timeline.filter((t) => t.kind === "status" && !t.internal).at(-1)?.id;
  assert.ok(publicId);
  const noted = await annotateStatusEmail(
    critical.id,
    "new",
    "in_progress",
    false,
    "Alex Admin <alex@saabai.ai>",
    publicId,
  );
  assert.ok(noted);
  const visible = noted!.timeline.filter((t) => t.kind === "status" && !t.internal);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].body, "Status set to In progress.");
  assert.equal(visible[0].authorName, "Saabai");
  const hidden = noted!.timeline.filter((t) => t.kind === "status" && t.internal);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].body, "Status: New → In progress · Client not emailed");
  assert.equal(hidden[0].authorName, "Alex Admin <alex@saabai.ai>");
  assert.equal(hidden[0].refId, publicId);

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

  assert.match(route, /authorName: await actorDisplayName\(\)/);
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
  assert.match(panel, /aria-label="Email the client about this change"/);
  assert.match(panel, /role="tab"/);
  assert.match(panel, /aria-selected=/);
  assert.match(panel, /e\.key === "Escape"/);
  assert.match(panel, /tabIndex=\{0\}/);
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
  const auth = readFileSync("app/saabai-admin/auth.css", "utf8");
  assert.match(auth, /font-family:Inter,system-ui,sans-serif/);
});

test("toClientView hides the email flag and any email address", async () => {
  const { toClientView } = await import("../lib/client-requests");
  const view = toClientView({
    id: "req-1",
    clientId: "client-n",
    clientName: "Priya",
    clientEmail: "priya@example.com",
    title: "Booking form not sending",
    description: "The form says sent.",
    type: "bug",
    priority: "critical",
    screenshots: [],
    status: "qa",
    autoHandle: true,
    discussWithShane: false,
    clarifierRounds: 0,
    adminNote: "staff only",
    agreedChange: "Update the form",
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-28T00:00:00.000Z",
    timeline: [
      {
        id: "s1",
        kind: "status",
        authorKind: "admin",
        authorName: "Shane Goldberg <shane@saabai.ai>",
        body: "Status: New → QA / Review · Client not emailed",
        createdAt: "2026-10-28T00:00:00.000Z",
      },
      {
        id: "c1",
        kind: "comment",
        authorKind: "admin",
        authorName: "Shane Goldberg <shane@saabai.ai>",
        body: "Thanks Priya, we are looking at it now.",
        createdAt: "2026-10-28T00:01:00.000Z",
      },
      {
        id: "n1",
        kind: "internal_note",
        authorKind: "admin",
        authorName: "Designer <designer@saabai.ai>",
        body: "Old number is hard coded. Client not emailed.",
        internal: true,
        createdAt: "2026-10-28T00:02:00.000Z",
      },
    ],
  });
  const output = JSON.stringify(view);
  assert.doesNotMatch(output, /emailed/i);
  assert.doesNotMatch(output, /not emailed/i);
  assert.doesNotMatch(output.replaceAll("priya@example.com", ""), /@/);
  assert.doesNotMatch(JSON.stringify(view.timeline), /@/);
  assert.equal("adminNote" in view, false);
  assert.equal(view.timeline.length, 2);
  assert.equal(view.timeline[0].body, "Status set to QA / Review.");
  assert.equal(view.timeline[0].authorName, "Saabai");
  assert.equal(view.timeline[1].authorName, "Shane Goldberg");
  assert.equal(view.timeline.some((t) => /designer@saabai\.ai|hard coded/.test(`${t.authorName} ${t.body}`)), false);
});

function clientView(timeline: {
  id: string;
  kind: "comment" | "status" | "internal_note" | "system" | "agreed_change";
  authorKind: "client" | "admin" | "assistant" | "system";
  authorName: string;
  body: string;
  internal?: boolean;
  createdAt: string;
}[]) {
  return toClientView({
    id: "req-1",
    clientId: "client-n",
    clientName: "Sam",
    clientEmail: "sam@example.com",
    title: "Phone number wrong on homepage",
    description: "Please change the number.",
    type: "other",
    priority: "normal",
    screenshots: [],
    status: "in_progress",
    autoHandle: true,
    discussWithShane: false,
    clarifierRounds: 0,
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-28T00:00:00.000Z",
    timeline,
  });
}

test("a client message containing emailed is unchanged and stays theirs", async () => {
  const body = "I haven't been emailed any updates yet.";
  const view = clientView([
    {
      id: "c",
      kind: "comment",
      authorKind: "client",
      authorName: "Sam",
      body,
      createdAt: "2026-10-28T00:00:00.000Z",
    },
  ]);
  assert.equal(view.timeline.length, 1);
  assert.equal(view.timeline[0].body, body);
  assert.equal(view.timeline[0].authorName, "Sam");
});

test("a client message that contains an email address is unchanged", async () => {
  const body = "Please change the contact email on my site to info@samsplumbing.com.au";
  const view = clientView([
    {
      id: "c",
      kind: "comment",
      authorKind: "client",
      authorName: "Sam",
      body,
      createdAt: "2026-10-28T00:00:00.000Z",
    },
  ]);
  assert.equal(view.timeline[0].body, body);
  assert.equal(view.timeline[0].authorName, "Sam");
});

test("a status entry is shown as Status set to X by Saabai", async () => {
  const view = clientView([
    {
      id: "s",
      kind: "status",
      authorKind: "admin",
      authorName: "Admin",
      body: "Status set to In progress.",
      createdAt: "2026-10-28T00:00:00.000Z",
    },
  ]);
  assert.equal(view.timeline[0].body, "Status set to In progress.");
  assert.equal(view.timeline[0].authorName, "Saabai");
});

test("a legacy status line is rewritten and the email flag is dropped", async () => {
  const view = clientView([
    {
      id: "s",
      kind: "comment",
      authorKind: "admin",
      authorName: "Shane Goldberg <shane@saabai.ai>",
      body: "Status: New → QA / Review · Client not emailed",
      createdAt: "2026-10-28T00:00:00.000Z",
    },
  ]);
  assert.equal(view.timeline[0].body, "Status set to QA / Review.");
  assert.equal(view.timeline[0].authorName, "Saabai");
  assert.doesNotMatch(view.timeline[0].body, /emailed/i);
});

test("an author stored as Name <email> is shown as the name only", async () => {
  const body = "Thanks, we are looking at it.";
  const view = clientView([
    {
      id: "c",
      kind: "comment",
      authorKind: "admin",
      authorName: "Shane Goldberg <shane@saabai.ai>",
      body,
      createdAt: "2026-10-28T00:00:00.000Z",
    },
  ]);
  assert.equal(view.timeline[0].authorName, "Shane Goldberg");
  assert.equal(view.timeline[0].body, body);
  assert.doesNotMatch(view.timeline[0].authorName, /@/);
});

test("a second status save cannot tag the other status note", async () => {
  const { createRequest, updateRequest, annotateStatusEmail, toClientView } = await import("../lib/client-requests");
  const created = await createRequest({
    description: "Please change the number.",
    type: "other",
    screenshots: [],
    clientId: "client-race",
    clientName: "Sam",
    clientEmail: "sam@example.com",
    title: "Phone number wrong on homepage",
    priority: "normal",
  });
  const first = await updateRequest(created.id, { status: "in_progress" });
  assert.ok(!("error" in first));
  if ("error" in first) return;
  const firstId = first.request.timeline.filter((t) => t.kind === "status" && !t.internal).at(-1)?.id;
  const second = await updateRequest(created.id, { status: "qa" });
  assert.ok(!("error" in second));
  if ("error" in second) return;
  const secondId = second.request.timeline.filter((t) => t.kind === "status" && !t.internal).at(-1)?.id;
  assert.ok(firstId && secondId && firstId !== secondId);

  const noted = await annotateStatusEmail(created.id, "new", "in_progress", false, "Shane Goldberg <shane@saabai.ai>", firstId);
  assert.ok(noted);
  const qaLine = noted!.timeline.find((t) => t.id === secondId);
  assert.equal(qaLine?.body, "Status set to QA / Review.");
  assert.equal(qaLine?.authorName, "Saabai");
  const aboutFirst = noted!.timeline.filter((t) => t.internal && t.refId === firstId);
  assert.equal(aboutFirst.length, 1);
  assert.match(aboutFirst[0].body, /In progress/);
  assert.match(aboutFirst[0].body, /Client not emailed/);
  assert.doesNotMatch(aboutFirst[0].body, /QA/);

  const missed = await annotateStatusEmail(created.id, "qa", "done", true, "Other <other@saabai.ai>", "missing-status-id");
  assert.ok(missed);
  assert.equal(missed!.timeline.filter((t) => t.internal && t.kind === "status").length, 1);

  const client = toClientView(missed!);
  const output = JSON.stringify(client.timeline);
  assert.doesNotMatch(output, /emailed/i);
  assert.doesNotMatch(output, /@/);
});
