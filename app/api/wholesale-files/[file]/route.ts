import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getWholesaleSession, wholesaleBasePath, WH_COOKIE } from "../../../../lib/wholesale-auth";
import { getWholesaleAdmin } from "../../../../lib/wholesale-admin-auth";
import { WH_FILES_DIR, WH_MEMBER_FILES } from "../../../../lib/wholesale-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve a members-only Wholesale file to a signed-in Wholesale member,
 * Wholesale admin or Saabai admin. Everyone else is sent to the client login.
 * Public in proxy.ts so it works on wholesalehomes.com.au; the check is here.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const type = Object.prototype.hasOwnProperty.call(WH_MEMBER_FILES, file) ? WH_MEMBER_FILES[file] : null;
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getWholesaleSession(req.cookies.get(WH_COOKIE)?.value);
  const allowed = member ?? (await getWholesaleAdmin(req.cookies));
  if (!allowed) {
    // Relative Location: the browser stays on whichever domain it asked on.
    const base = wholesaleBasePath(req.headers.get("host"));
    return new NextResponse(null, { status: 307, headers: { Location: `${base}/client-login`, "Cache-Control": "private, no-store" } });
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), WH_FILES_DIR, file));
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("wholesale-files read error:", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
