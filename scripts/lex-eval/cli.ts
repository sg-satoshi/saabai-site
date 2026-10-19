/**
 * Lex research model comparison.
 *   ANTHROPIC_API_KEY=... OPENAI_API_KEY=... SERPER_API_KEY=... npx tsx scripts/lex-eval/cli.ts [budgetUsd=5]
 * Runs every question on each model, stops before the budget is exceeded, writes
 * scripts/lex-eval/results.json and prints a summary.
 */
import { writeFileSync } from "node:fs";
import { EVAL_QUESTIONS } from "./questions";
import { runOne, PRICES, type EvalResult } from "./run-one";
import { summarise } from "./summary";

const budget = Number(process.argv[2] ?? 5);
const models = Object.keys(PRICES);
const results: EvalResult[] = [];
let spent = 0;
const perQ = 0.15; // stop margin: a long answer rarely costs more than this

for (const q of EVAL_QUESTIONS) {
  for (const m of models) {
    if (spent + perQ > budget) { console.log(`Budget stop at US$${spent.toFixed(2)}`); break; }
    const r = await runOne(m, q);
    spent += r.costUsd;
    results.push(r);
    console.log(`${q.id} ${m} ${r.ok ? "ok" : "ERR " + r.error} ${(r.ms / 1000).toFixed(1)}s US$${r.costUsd.toFixed(3)} acc ${(r.accuracy * 100).toFixed(0)}%`);
  }
}
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2));
console.log(summarise(results));
