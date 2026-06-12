import { NextRequest, NextResponse } from "next/server";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  addInteraction,
} from "../../../lib/saabai-crm";
import type { CreateLeadInput, LeadStage } from "../../../lib/saabai-crm";

// ── GET /api/saabai-crm ──────────────────────────────────────────────────────
// Returns all leads. Supports ?id=xxx to get a single lead.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  }

  const leads = await getAllLeads();
  return NextResponse.json(leads);
}

// ── POST /api/saabai-crm ─────────────────────────────────────────────────────
// Create a new lead.

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // Validate required fields
    const required: (keyof CreateLeadInput)[] = [
      "companyName",
      "contactName",
      "phone",
      "email",
      "source",
    ];
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string" || body[field].trim() === "") {
        return NextResponse.json(
          { error: `Missing or invalid required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const input: CreateLeadInput = {
      companyName: body.companyName as string,
      contactName: body.contactName as string,
      phone: body.phone as string,
      email: body.email as string,
      source: body.source as string,
      stage: (body.stage as LeadStage) ?? "new",
      notes: typeof body.notes === "string" ? body.notes : "",
      followUpDate: typeof body.followUpDate === "string" ? body.followUpDate : undefined,
    };

    const id = await createLead(input);
    if (!id) {
      return NextResponse.json(
        { error: "Redis unavailable or lead could not be created" },
        { status: 503 }
      );
    }

    const lead = await getLeadById(id);
    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

// ── PATCH /api/saabai-crm ────────────────────────────────────────────────────
// Update a lead (merge fields). Requires ?id=xxx.

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Query parameter 'id' is required" },
      { status: 400 }
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    // Pull out only valid updatable fields
    const allowedFields = [
      "companyName",
      "contactName",
      "phone",
      "email",
      "source",
      "stage",
      "notes",
      "followUpDate",
      "lastContactedAt",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await updateLead(id, updates as Parameters<typeof updateLead>[1]);
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

// ── DELETE /api/saabai-crm?id=xxx ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Query parameter 'id' is required" },
      { status: 400 }
    );
  }

  const deleted = await deleteLead(id);
  if (!deleted) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// ── POST /api/saabai-crm/interaction ─────────────────────────────────────────
// Add an interaction to a lead.

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
