import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { loadClients } from "../../../../lib/clients";
import { listDirectoryUsers, saveDirectoryUser } from "../../../../lib/user-directory";
import { ALL_PRODUCTS, PRODUCT_IDS } from "../../../../lib/user-products";
import type { ProductId } from "../../../../lib/user-products";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    // Only admins can manage other users' products
    const allUsers = await listDirectoryUsers();
    const requester = allUsers.find((u) => u.id === session.clientId);
    const isAdmin = requester?.role === "admin";

    const { email, products } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required." }, { status: 400 });
    }

    // Validate product IDs
    if (!Array.isArray(products)) {
      return Response.json({ error: "Products must be an array." }, { status: 400 });
    }
    const validProducts: ProductId[] = products.filter((p: string) =>
      PRODUCT_IDS.includes(p as ProductId)
    ) as ProductId[];

    // Find the target user
    const dirUser = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!dirUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // If not admin, only allow updating own products
    if (!isAdmin && requester?.email.toLowerCase() !== email.toLowerCase()) {
      return Response.json({ error: "Not authorized." }, { status: 403 });
    }

    dirUser.products = validProducts;
    await saveDirectoryUser(dirUser);

    return Response.json({
      ok: true,
      email: dirUser.email,
      products: dirUser.products,
    });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const allUsers = await listDirectoryUsers();
    const user = allUsers.find((u) => u.id === session.clientId);

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({
      email: user.email,
      products: user.products || [],
      availableProducts: PRODUCT_IDS.map((id) => ({
        id,
        label: ALL_PRODUCTS[id].label,
        icon: ALL_PRODUCTS[id].icon,
      })),
    });
  } catch {
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
