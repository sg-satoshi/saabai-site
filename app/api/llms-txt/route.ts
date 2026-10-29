/**
 * llms.txt / llms-full.txt with live sale prices. Only reached through the beforeFiles
 * rewrite in next.config.ts, which exists only when SALE_PRICING_ENABLED is on at build.
 * No live sale: returns the static public file byte for byte.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPublicSales } from "@/lib/public-sales";
import { applySalesToText } from "@/lib/sale-price";

export const runtime = "nodejs";
export const revalidate = 60;

const FILES = { short: "llms.txt", full: "llms-full.txt" } as const;

export async function GET(req: Request) {
  const which = new URL(req.url).searchParams.get("file") === "full" ? "full" : "short";
  const raw = await readFile(path.join(process.cwd(), "public", FILES[which]), "utf8");
  const body = applySalesToText(raw, await getPublicSales());
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" },
  });
}
