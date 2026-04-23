import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { signSession } from "../../../lib/portal-session";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pw = formData.get("pw") as string | null;
  const PASSWORD = process.env.REX_DASHBOARD_PASSWORD ?? "";

  if (PASSWORD && pw === PASSWORD) {
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
