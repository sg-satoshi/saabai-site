/**
 * LeadGen Notification Preferences API
 *
 * PATCH: Update notification channel preferences for a client.
 */
import { NextRequest } from "next/server";
import { getClient, updateClient } from "../../../../lib/leadgen-config";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, notifications } = body;

    if (!clientId || !notifications) {
      return Response.json({ error: "clientId and notifications required" }, { status: 400 });
    }

    const client = await getClient(clientId);
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    await updateClient(clientId, {
      notifications: {
        email: notifications.email ?? true,
        sms: notifications.sms ?? true,
        whatsapp: notifications.whatsapp ?? true,
        notificationPhone: client.notifications?.notificationPhone || client.phone,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error("[LeadGen Notifications] Error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
