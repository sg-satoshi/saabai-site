/**
 * THROWAWAY: preview-only model test runner for the Lex model comparison.
 * Lives only on branch eval/lex-model-run. Never merged. 404 everywhere else.
 */
import { createHash } from "node:crypto";
import { getRedis } from "../../../lib/redis";
import { EVAL_QUESTIONS } from "../../../scripts/lex-eval/questions";
import { runOne, PRICES } from "../../../scripts/lex-eval/run-one";

export const runtime = "nodejs";
export const maxDuration = 120;

const TOKEN_SHA256 = "0bc843223024541134789c8bbde173be324db7ff48fcdb1f3f02f3964174556e";
const MAX_RUNS = 50;

function allowed(req: Request): boolean {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "eval/lex-model-run") return false;
  const t = req.headers.get("x-eval-token") ?? "";
  return createHash("sha256").update(t).digest("hex") === TOKEN_SHA256;
}
const nf = () => new Response("Not found", { status: 404 });

export async function GET(req: Request) {
  if (!allowed(req)) return nf();
  return Response.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY, openai: !!process.env.OPENAI_API_KEY, serper: !!process.env.SERPER_API_KEY,
    premium: (process.env.PREMIUM_CHAT_MODEL ?? "").trim() || null, lex: (process.env.LEX_RESEARCH_MODEL ?? "").trim() || null,
  });
}

export async function POST(req: Request) {
  if (!allowed(req)) return nf();
  const { model, id } = await req.json();
  if (!(model in PRICES)) return Response.json({ error: "model" }, { status: 400 });
  const q = EVAL_QUESTIONS.find((x) => x.id === id);
  if (!q) return Response.json({ error: "id" }, { status: 400 });
  const redis = getRedis();
  if (!redis) return Response.json({ error: "no redis for run cap" }, { status: 503 });
  const n = await redis.incr("lex:eval:runs");
  await redis.expire("lex:eval:runs", 86400);
  if (n > MAX_RUNS) return Response.json({ error: "run cap reached" }, { status: 429 });
  return Response.json(await runOne(model, q));
}
