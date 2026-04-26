import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import LexClientsClient from "./LexClientsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lex Clients — Saabai Admin" };

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export default async function LexClientsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/lex-clients");

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    redirect("/login?redirect=/saabai-admin/lex-clients");
  }

  return <LexClientsClient />;
}
