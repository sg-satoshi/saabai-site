import { requireAdminSession } from "@/lib/admin-guard";
import { getDoc, patchDoc } from "@/lib/growth/store";
import { sendMarketingEmail } from "@/lib/growth/send";
import type { Testimonial } from "@/lib/growth/growth2";

export const runtime = "nodejs";

/** actions: request (sends the ask now), approve, publish, hide. Publish respects the client's consent level. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const t = await getDoc<Testimonial>("testimonials", id);
  if (!t) return Response.json({ error: "Not found" }, { status: 404 });
  const { action } = await req.json().catch(() => ({}));
  if (action === "request") {
    if (!["scheduled", "awaiting_approval"].includes(t.status)) return Response.json({ error: `Already ${t.status}` }, { status: 409 });
    const first = t.name?.split(" ")[0];
    const r = await sendMarketingEmail(t.email, "Two minutes on your Blueprint?",
      `Hi ${first || "there"},\n\nWould you mind telling me how the Blueprint landed? It's one rating and a sentence or two, and you choose whether we can share it.\n\nhttps://saabai.ai/testimonial/${t.token}\n\nThanks,\nShane`, "testimonial");
    if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
    return Response.json({ testimonial: await patchDoc<Testimonial>("testimonials", id, { status: "requested" }) });
  }
  if (action === "approve") return Response.json({ testimonial: await patchDoc<Testimonial>("testimonials", id, { status: "approved" }) });
  if (action === "publish") {
    if (!t.consent || t.consent === "internal") return Response.json({ error: "The client didn't consent to publishing" }, { status: 409 });
    return Response.json({ testimonial: await patchDoc<Testimonial>("testimonials", id, { status: "published" }) });
  }
  if (action === "hide") return Response.json({ testimonial: await patchDoc<Testimonial>("testimonials", id, { status: "hidden" }) });
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
