/**
 * Live check of the Federal Register of Legislation status tool. Read-only GETs to
 * api.prod.legislation.gov.au, no auth, no other network.
 *   npx tsx scripts/lex-frl-live.ts
 */
import { checkLegislationStatus } from "../lib/lex-tools";

const ACTS = [
  "Privacy Act 1988",
  "Corporations Act 2001",
  "Sales Tax Assessment Act (No. 2) 1934", // repealed
  "Trade Practices Act 1974", // renamed
  "Not A Real Act 2099",
  "{{PERSON_1}} Act", // must be refused locally
];

async function main() {
for (const act of ACTS) {
  const t0 = Date.now();
  const r = await checkLegislationStatus(act);
  console.log(`\n# ${act} (${Date.now() - t0} ms)`);
  if (r.error) console.log(`  error: ${r.error}`);
  for (const a of r.acts) {
    console.log(`  ${a.id} | ${a.name} | ${a.status} | inForce=${a.isInForce} | commencedNotIncorporated=${a.hasCommencedUnincorporatedAmendments}${a.formerName ? ` | formerly ${a.formerName}` : ""}`);
    console.log(`    future: ${JSON.stringify(a.statusPossibleFuture)} | ${a.url}`);
  }
}
}

main();
