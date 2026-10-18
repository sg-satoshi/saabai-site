import { NextRequest } from "next/server";
import { handleChat, optionsResponse } from "../../../../lib/chatbot/handler";

export const runtime = "nodejs";
export const maxDuration = 30;

// The single chat API for platform bots (used by the versioned widget in the next stage).
export const OPTIONS = (req: NextRequest) => optionsResponse(req);
export const POST = (req: NextRequest) => handleChat(req);
