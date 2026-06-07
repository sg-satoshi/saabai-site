/**
 * LeadGen — Create/list client configurations
 */

import { NextRequest } from "next/server";
import { createClient, listClients } from "../../../../lib/leadgen-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, businessName, niche, description, phone, email, serviceArea, businessHours, branding } = body;

    if (!slug || !businessName || !email) {
      return Response.json(
        { error: "slug, businessName, and email are required" },
        { status: 400 }
      );
    }

    const client = await createClient({
      slug,
      businessName,
      niche: niche || "general",
      description: description || "",
      phone: phone || "",
      email,
      serviceArea: serviceArea || "",
      businessHours: businessHours || "",
      branding: branding || {
        primaryColor: "#1e3a5f",
        accentColor: "#2563eb",
        widgetTitle: "Chat with us",
        greeting: "Hi! How can we help you today?"
      },
      status: "active",
    });

    return Response.json({ client }, { status: 201 });
  } catch (e) {
    console.error("leadgen-config POST error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const clients = await listClients();
    return Response.json({ clients });
  } catch (e) {
    console.error("leadgen-config GET error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, businessName, phone, serviceArea, businessHours, description, branding } = body;

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const { updateClient } = await import("../../../../lib/leadgen-config");

    const patch: Record<string, unknown> = {};
    if (businessName !== undefined) patch.businessName = businessName;
    if (phone !== undefined) patch.phone = phone;
    if (serviceArea !== undefined) patch.serviceArea = serviceArea;
    if (businessHours !== undefined) patch.businessHours = businessHours;
    if (description !== undefined) patch.description = description;
    if (branding !== undefined) patch.branding = branding;

    await updateClient(id, patch);

    return Response.json({ success: true });
  } catch (e) {
    console.error("leadgen-config PATCH error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
