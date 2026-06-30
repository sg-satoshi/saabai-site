import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const validEmail = process.env.WHOLESALE_CLIENT_EMAIL;
  const validPass = process.env.WHOLESALE_CLIENT_PASS;

  if (!validEmail || !validPass) {
    return NextResponse.json({ success: false, error: "Auth not configured" }, { status: 500 });
  }

  if (
    email?.trim().toLowerCase() === validEmail.toLowerCase() &&
    password === validPass
  ) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
}
