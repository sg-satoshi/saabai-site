import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { signSession } from "../../../lib/portal-session";
import { verifyPassword } from "../../../lib/password";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pw = formData.get("pw") as string | null;
  const PASSWORD = process.env.REX_DASHBOARD_PASSWORD ?? "";

  // Constant-time; the env value may be plain text or a scrypt hash.
  if (PASSWORD && typeof pw === "string" && (await verifyPassword(pw, PASSWORD)).ok) {
    const token = signSession("rex-dashboard");
    const cookieStore = await cookies();
    cookieStore.set("rex_dash_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/rex-dashboard",
    });
  }

  redirect("/rex-dashboard");
}
