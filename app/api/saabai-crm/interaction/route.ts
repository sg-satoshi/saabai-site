import { NextRequest, NextResponse } from "next/server";
import { addInteraction, getLeadById } from "../../../../lib/saabai-crm";

// ── POST /api/saabai-crm/interaction ─────────────────────────────────────────
// Add an interaction to a lead's interaction log.

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const leadId = body.leadId;
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid field: leadId" },
        { status: 400 }
      );
    }

    if (!body.type || typeof body.type !== "string" || body.type.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid field: type" },
        { status: 400 }
      );
    }

    if (!body.notes || typeof body.notes !== "string" || body.notes.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid field: notes" },
        { status: 400 }
      );
    }

    // Verify lead exists
    const existing = await getLeadById(leadId);
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updated = await addInteraction(leadId, {
      type: body.type as string,
      notes: body.notes as string,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to add interaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
