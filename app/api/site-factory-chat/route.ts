import { NextRequest } from "next/server";
import { handleChat, optionsResponse } from "../../../lib/chatbot/handler";

export const runtime = "nodejs";
export const maxDuration = 30;

// Existing factory widgets post here. It now shares the central chat handler.
export const OPTIONS = (req: NextRequest) => optionsResponse(req);
export const POST = (req: NextRequest) => handleChat(req);
