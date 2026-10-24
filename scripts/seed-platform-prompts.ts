/**
 * Hand-run only. Copies Christina and Zara's current system prompts onto their
 * site records, adds the live domains, and turns chatbot.enabled on.
 * Idempotent. Dry run unless you pass --apply. This file is not part of build or dev.
 *
 *   npx tsx scripts/seed-platform-prompts.ts
 *   npx tsx scripts/seed-platform-prompts.ts --dry-run
 *   npx tsx scripts/seed-platform-prompts.ts --apply
 */
import { applySeedActions, planPlatformSeed, runMode, type SeedAction } from "../lib/chatbot/platform-bot-seed";

function isDirectRun(): boolean {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("seed-platform-prompts.ts") || entry.endsWith("seed-platform-prompts.js");
}

function describe(action: SeedAction): void {
  if (action.kind === "noop") {
    console.log(`unchanged  ${action.slug} (${action.id})`);
    return;
  }
  if (action.kind === "create") {
    console.log(`create     ${action.slug}  domains=${action.site.domains.join(",")}  chatbot.enabled=true`);
    return;
  }
  console.log(`update     ${action.slug} (${action.id})  ${action.changes.join(", ")}  domains=${action.domains.join(",")}`);
}

async function main() {
  const mode = runMode(process.argv.slice(2));
  const dryRun = mode === "dry-run";
  console.log(dryRun ? "Dry run. No site records will be written." : "Applying changes to site records.");

  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const { listRedisSites, updateSite, createSite } = await import("../lib/site-registry");
  const stored = await listRedisSites();
  const actions = planPlatformSeed(stored.map((s) => ({ id: s.id, slug: s.slug, domains: s.domains, chatbot: s.chatbot })));
  for (const action of actions) describe(action);

  const { writes } = await applySeedActions(actions, {
    dryRun,
    update: async (id, patch) => {
      await updateSite(id, { domains: patch.domains, chatbot: patch.chatbot });
    },
    create: async (site) => {
      await createSite(site);
    },
  });

  if (dryRun) console.log("Dry run finished. Re-run with --apply to write.");
  else console.log(`Wrote ${writes} site record${writes === 1 ? "" : "s"}.`);
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
