import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import ProductsClient from "./ProductsClient";

export const metadata = { title: "Products — Saabai Admin" };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) redirect("/login?redirect=/saabai-admin/products");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login?redirect=/saabai-admin/products");

  const isAdmin = await isAdminSession(session.clientId);
  if (!isAdmin) redirect("/saabai-admin");

  return <ProductsClient />;
}
