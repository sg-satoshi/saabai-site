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
      niche: niche || "plumbing",
      description: description || "Emergency and scheduled plumbing services",
      phone: phone || "",
      email,
      serviceArea: serviceArea || "",
      businessHours: businessHours || "",
      botName: "Jack",
      personality: "aussie-tradie",
      avatarPreset: "plumber",
      services: [
        { name: "Blocked Drains", type: "emergency" },
        { name: "Hot Water Systems", type: "standard" },
        { name: "Burst Pipes", type: "emergency" },
        { name: "Gas Fitting", type: "standard" },
        { name: "General Plumbing", type: "standard" },
      ],
      leadCaptureFields: {
        name: "required",
        phone: "required",
        email: "optional",
        address: "optional",
        service: "required",
        urgency: "required",
        message: "optional",
      },
      afterHoursMessage: "We'll get back to you first thing in the morning.",
      sameDayService: true,
      expectedResponseTime: "Within 30 minutes",
      widgetPosition: "bottom-right",
      widgetSize: "standard",
      autoPopupDelay: 0,
      hideOnMobile: false,
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
    const { id, businessName, phone, serviceArea, businessHours, description, branding,
            botName, personality, personalityDescription, avatarPreset,
            services, leadCaptureFields,
            afterHoursMessage, sameDayService, expectedResponseTime,
            widgetPosition, widgetSize, autoPopupDelay, hideOnMobile, customCss } = body;

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
    if (botName !== undefined) patch.botName = botName;
    if (personality !== undefined) patch.personality = personality;
    if (personalityDescription !== undefined) patch.personalityDescription = personalityDescription;
    if (avatarPreset !== undefined) patch.avatarPreset = avatarPreset;
    if (services !== undefined) patch.services = services;
    if (leadCaptureFields !== undefined) patch.leadCaptureFields = leadCaptureFields;
    if (afterHoursMessage !== undefined) patch.afterHoursMessage = afterHoursMessage;
    if (sameDayService !== undefined) patch.sameDayService = sameDayService;
    if (expectedResponseTime !== undefined) patch.expectedResponseTime = expectedResponseTime;
    if (widgetPosition !== undefined) patch.widgetPosition = widgetPosition;
    if (widgetSize !== undefined) patch.widgetSize = widgetSize;
    if (autoPopupDelay !== undefined) patch.autoPopupDelay = autoPopupDelay;
    if (hideOnMobile !== undefined) patch.hideOnMobile = hideOnMobile;
    if (customCss !== undefined) patch.customCss = customCss;

    await updateClient(id, patch);

    return Response.json({ success: true });
  } catch (e) {
    console.error("leadgen-config PATCH error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
