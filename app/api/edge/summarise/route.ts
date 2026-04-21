import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  saveEdgeSession,
  saveEdgeProfile,
  getEdgeProfile,
  saveEdgeTranscript,
} from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingMessage = {
  role: string;
  content: unknown;
};

type ParsedSummary = {
  summary?: string;
  topics?: string | string[];
  insights?: string | string[];
  newCommitments?: string;
  profileUpdates?: Record<string, string>;
};

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part: { type?: string; text?: string }) =>
        part?.type === "text" && typeof part.text === "string" ? part.text : ""
      )
      .join("");
  }

  return "";
}

function normalizeStringArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => v.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

export async function POST(req: Request) {
  const { messages, mood } = (await req.json()) as {
    messages?: IncomingMessage[];
    mood?: number;
  };

  if (!messages || messages.length < 2) {
    return Response.json(
      { error: "Not enough messages to summarise" },
      { status: 400 }
    );
  }

  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const transcript = nonSystemMessages
    .map((m) => {
      const content = extractMessageText(m.content);
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join("\n\n");

  const existingProfile = await getEdgeProfile();

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `You are analysing a coaching session between Edge (performance coach) and Shane (operator/entrepreneur).

TRANSCRIPT:
${transcript}

EXISTING PROFILE:
${existingProfile ? JSON.stringify(existingProfile, null, 2) : "No existing profile — this is the first session."}

Generate a JSON object with these fields:
{
  "summary": "2-3 sentence summary of what was discussed and any shifts that happened",
  "topics": ["topic 1", "topic 2"],
  "insights": ["insight 1", "insight 2"],
  "newCommitments": "any specific commitments Shane made (or empty string)",
  "profileUpdates": {
    "coreGoals": "updated understanding of Shane's core goals (if new info emerged, otherwise keep existing)",
    "currentFocus": "what Shane is currently focused on",
    "patterns": "any recurring patterns noticed — update/add to existing",
    "strengths": "strengths observed — update/add to existing",
    "challenges": "current challenges — update/add to existing",
    "breakthroughs": "any breakthroughs this session (or keep existing)",
    "commitments": "all active commitments (merge new with existing)",
    "watchFor": "things to watch for / potential blind spots — update/add",
    "worksWith": "approaches/techniques that seem to work well for Shane",
    "rawNotes": "Edge's honest 2-3 sentence current assessment of where Shane is at — direct, not sycophantic"
  }
}

Return ONLY valid JSON. No markdown. No explanation.`,
  });

  let parsed: ParsedSummary;

  try {
    let jsonText = text.trim();

    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
    }

    parsed = JSON.parse(jsonText) as ParsedSummary;
  } catch {
    return Response.json(
      { error: "Failed to parse summary", raw: text.slice(0, 200) },
      { status: 500 }
    );
  }

  const normalizedTopics = normalizeStringArray(parsed.topics);
  const normalizedInsights = normalizeStringArray(parsed.insights);

  const sessionSavePromise = saveEdgeSession({
    mood,
    summary: parsed.summary,
    topics: normalizedTopics,
    insights: normalizedInsights,
    newCommitments: parsed.newCommitments,
    messageCount: nonSystemMessages.length,
  });

  const profileSavePromise = parsed.profileUpdates
    ? saveEdgeProfile({
        data: {
          ...parsed.profileUpdates,
          totalSessions: ((existingProfile?.data?.totalSessions as number) ?? 0) + 1,
          lastMood: mood,
          lastSessionDate: new Date().toISOString().split("T")[0],
        },
      })
    : Promise.resolve(null);

  const [sessionId] = await Promise.all([
    sessionSavePromise,
    profileSavePromise,
  ]);

  if (sessionId) {
    await saveEdgeTranscript(
      sessionId,
      nonSystemMessages.map((m) => ({
        role:
          m.role === "user" || m.role === "assistant" || m.role === "system"
            ? m.role
            : "user",
        content: extractMessageText(m.content),
      }))
    );
  }

  return Response.json({
    sessionId,
    summary: parsed.summary,
  });
}