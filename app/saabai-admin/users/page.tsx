import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "User Directory — Saabai" };

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) redirect("/login?redirect=/saabai-admin/users");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/users");

  return <UsersClient />;
}
