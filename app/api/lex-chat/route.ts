import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { getSaabaiModel } from "../../../lib/chat-config";
import { getConversations } from "../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

function extractConversationPersistenceFields(payload: Record<string, unknown> | undefined) {
  return {
    threadId:
      typeof payload?.threadId === "string" && payload.threadId.trim()
        ? payload.threadId.trim()
        : undefined,
    projectId:
      typeof payload?.projectId === "string" && payload.projectId.trim()
        ? payload.projectId.trim()
        : undefined,
  };
}


type IncomingMessage = {
  role: "user" | "assistant" | "system";
  parts?: { type: string; text?: string }[];
  content?: string;
};

type RequestBody = {
  messages: IncomingMessage[];
  threadId?: string;
};

function msgText(msg: IncomingMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .trim();
  }

  return typeof msg.content === "string" ? msg.content.trim() : "";
}

function normalizeMessages(messages: IncomingMessage[]) {
  return messages.map((msg) => {
    if (msg.parts && msg.parts.length > 0) {
      return {
        role: msg.role,
        parts: msg.parts,
      };
    }

    if (msg.content) {
      return {
        role: msg.role,
        parts: [{ type: "text", text: msg.content }],
      };
    }

    return {
      role: msg.role,
      parts: [],
    };
  });
}

async function loadPreviousMessagesByThreadId(threadId?: string) {
  if (!threadId) return [];

  const conversations = await getConversations(200);

  const threadConversations = conversations.filter(
    (c) => c.threadId === threadId
  );

  if (threadConversations.length === 0) return [];

  // Sort oldest → newest
  threadConversations.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const messages: IncomingMessage[] = [];

  for (const conv of threadConversations) {
    if (conv.visitorFacts) {
      messages.push({
        role: "system",
        content: `Known facts: ${JSON.stringify(conv.visitorFacts)}`,
      });
    }

    if (conv.keyTopics && conv.keyTopics.length > 0) {
      messages.push({
        role: "system",
        content: `Topics discussed: ${conv.keyTopics.join(", ")}`,
      });
    }
  }

  return messages;
}

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;

  const { messages, threadId } = body;

  const previousMessages = await loadPreviousMessagesByThreadId(threadId);

  const combinedMessages = [
    ...previousMessages,
    ...normalizeMessages(messages),
  ];

  const model = getSaabaiModel();

  const result = streamText({
    model,
    messages: await convertToModelMessages(
      combinedMessages as Parameters<typeof convertToModelMessages>[0]
    ),
    stopWhen: stepCountIs(4),
  });

  return result.toUIMessageStreamResponse();
}