/**
 * Chatbot prompt eval. No model call. No lead POST.
 *
 *   npx tsx scripts/chatbot-eval.ts
 */
import { LEAD_ENDPOINTS, runAllEvals } from "../lib/chatbot/eval-set";

function guardFetch() {
  const real = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || "GET").toUpperCase();
    if (method === "POST" && LEAD_ENDPOINTS.some((path) => url.includes(path))) {
      throw new Error(`Blocked lead POST ${url}`);
    }
    return real(input, init);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = real;
  };
}

function main() {
  const restore = guardFetch();
  const reports = runAllEvals();
  let failed = 0;
  for (const report of reports) {
    console.log(`${report.botName} (${report.slug}): ${report.normal} normal, ${report.trick} trick, disclosure x${report.greetingDisclosure}, ${report.passed} passed, ${report.failed} failed`);
    for (const hit of report.hits) {
      if (hit.pass) continue;
      failed++;
      console.log(`  FAIL ${hit.id} ${hit.q}`);
      if (hit.missing.length) console.log(`    missing: ${hit.missing.join(" | ")}`);
      if (hit.forbidden.length) console.log(`    forbidden: ${hit.forbidden.join(" | ")}`);
    }
  }
  restore();
  if (failed) {
    console.error(`${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("All chatbot eval checks passed. No lead endpoint was called.");
}

main();
