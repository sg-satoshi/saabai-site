import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import { fetchTranscript } from "../../../lib/rex-stats";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Require valid session
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const ts = req.nextUrl.searchParams.get("ts");
  if (!ts) return new Response("Missing ts param", { status: 400 });

  const messages = await fetchTranscript(ts);
  if (!messages) return new Response("Not found", { status: 404 });

  return Response.json(messages);
}
