import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { loadClients } from "../../../../lib/clients";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { productsFromDashboardUrl, ALL_PRODUCTS } from "../../../../lib/user-products";
import type { ProductInfo } from "../../../../lib/user-products";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ products: [], user: null }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return Response.json({ products: [], user: null }, { status: 401 });
  }

  const { clientId } = session;

  // Check env-var clients first
  const envClient = loadClients().find((c) => c.id === clientId);
  if (envClient) {
    const productIds = productsFromDashboardUrl(envClient.dashboardUrl);
    return Response.json({
      products: productIds.map((id) => ALL_PRODUCTS[id]),
      user: {
        name: envClient.name,
        email: envClient.email,
        dashboardUrl: envClient.dashboardUrl,
      },
    });
  }

  // Check Redis user directory
  const allUsers = await (await import("../../../../lib/user-directory")).listDirectoryUsers();
  const dirUser = allUsers.find((u) => u.id === clientId);
  if (dirUser) {
    const productIds = productsFromDashboardUrl(dirUser.dashboardUrl);
    return Response.json({
      products: productIds.map((id) => ALL_PRODUCTS[id]),
      user: {
        name: dirUser.name,
        email: dirUser.email,
        dashboardUrl: dirUser.dashboardUrl,
      },
    });
  }

  return Response.json({ products: [], user: null }, { status: 401 });
}
