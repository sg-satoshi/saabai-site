import { type NextRequest } from "next/server";
import { clearSessionCookieHeader } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return new Response(null, {
    status: 303,
    headers: {
      Location:     new URL("/login", req.url).toString(),
      "Set-Cookie": clearSessionCookieHeader(),
    },
  });
}
