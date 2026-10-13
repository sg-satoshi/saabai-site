import { writeFileSync, mkdirSync } from "fs";
import { criticalAlertEmail } from "../lib/request-alerts";
import { buildNewRequestEmail, buildStatusEmail } from "../lib/client-request-emails";
import { EMAIL_BRAND, renderBrandedEmail } from "../lib/email/branded-layout";
import type { ClientRequest } from "../lib/client-requests";

const out = "/workspace/requests-qa";
mkdirSync(out, { recursive: true });

const base = {
  id: "req-hours-demo",
  clientId: "harbour",
  clientName: "Jess Nguyen",
  clientEmail: "jess@harbourphysio.test",
  siteId: "harbour",
  siteName: "Harbour Physio",
  title: "Update opening hours from 9-5 to 8-6",
  description: "Please update our opening hours from 9-5 to 8-6 on the contact page and footer.",
  type: "text_change" as const,
  priority: "normal" as const,
  screenshots: [] as string[],
  status: "awaiting_client" as const,
  autoHandle: true,
  discussWithShane: false,
  clarifierRounds: 1,
  timeline: [],
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
} satisfies ClientRequest;

const crit: ClientRequest = {
  ...base,
  id: "req-critical-demo",
  title: "Booking page shows Error 500",
  description: "Patients can't book. Error 500 since 8:30pm.",
  priority: "critical",
  type: "bug",
  assignee: "chief_ai",
  status: "new",
};

const clar = renderBrandedEmail({
  subject: "Quick question on your request: Update opening hours from 9-5 to 8-6",
  preheader: "Saabai Assistant needs a detail before we start.",
  eyebrow: "Request update",
  title: "A quick question from Saabai Assistant",
  bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Hi Jess,</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Thanks for the request <strong>“Update opening hours from 9-5 to 8-6”</strong>. Before we jump in:</p>
    <ul style="margin:0 0 14px;padding-left:20px;color:#13152a;font-size:15px;line-height:1.65;">
      <li style="margin:0 0 6px;">Should we update both the Contact page and the site footer?</li>
      <li style="margin:0 0 6px;">Do the new hours apply every weekday, or only some days?</li>
    </ul>
    <p style="margin:0;font-size:14px;color:#5f6580;">Reply in your Client Portal thread.</p>`,
  cta: { href: EMAIL_BRAND.portalUrl, label: "Open your portal" },
  textBody: ["Hi Jess", "Contact + footer?", "Weekdays only?"],
});

const pairs: [string, { subject: string; html: string; text: string }][] = [
  ["new-request-hours", buildNewRequestEmail(base)],
  ["clarifier-questions-hours", clar],
  ["status-done", buildStatusEmail({ ...base, status: "done" })],
  ["critical-alert", criticalAlertEmail(crit, "shanegoldberg@pm.me").email],
];

const readme = [
  "# Requests preview QA",
  "",
  "Example flow: **update our opening hours from 9-5 to 8-6**",
  "",
  "## Spec notes (Shane)",
  "- Type: dropdown; Priority: segmented (Low / Normal / High / Critical)",
  "- Non-Critical: AI clarifier (Saabai Assistant), max 3 rounds, then Shane",
  "- Critical: Auto-handle by Chief AI (not Discuss). Escalate / Take over → Discuss + assign to clicker (Shane for now; easy to change)",
  "- Portal Critical warning: alerts the Saabai team, Chief included",
  "- Alert email: Chief has picked this up; buttons View in Mission Control + Take over",
  "",
  "## Files",
];

for (const [name, email] of pairs) {
  writeFileSync(`${out}/${name}.html`, email.html);
  writeFileSync(`${out}/${name}.txt`, email.text);
  writeFileSync(`${out}/${name}.meta.json`, JSON.stringify({ subject: email.subject }, null, 2));
  readme.push(`- \`${name}.html\` — ${email.subject}`);
}
readme.push(
  "",
  "## Manual checks",
  "1. Portal `/client-portal` → Requests → New request: Type dropdown, Priority segmented, Critical warn copy",
  "2. Submit hours example → clarifier asks or agrees → Triaged + Agreed change",
  "3. Critical → email shanegoldberg@pm.me + Telegram if env set; assignee Chief AI; mode Auto",
  "4. Admin inbox Critical strip: Take over; detail: Chief is handling + Escalate to Shane",
  "5. Impersonation: create/reply/upload blocked",
  "6. Change log at `/saabai-admin/change-log`",
  "",
);
writeFileSync(`${out}/README.md`, readme.join("\n"));
console.log("wrote", pairs.length, "emails");
