import { llmsSummary } from "../seo";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsSummary(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
