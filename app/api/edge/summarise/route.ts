import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { saveEdgeSession, saveEdgeProfile, getEdgeProfile } from "../../../../lib/redis";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, mood } = await req.json();

  if (!messages || messages.length < 2) {
    return Response.json({ error: "Not enough messages to summarise" }, { status: 400 });
  }

  const transcript = messages
    .filter((m: { role: string }) => m.role !== "system")
    .map((m: { role: string; content: unknown }) => {
      const content = typeof m.content === "string" ? m.content
        : Array.isArray(m.content) ? m.content.map((p: { type: string; text?: string }) => p.type === "text" ? p.text : "").join("") : "";
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join("\n\n");

  const existingProfile = await getEdgeProfile();

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: `You are analysing a coaching session between Edge (performance coach) and Shane (operator/entrepreneur).

TRANSCRIPT:
${transcript}

EXISTING PROFILE:
${existingProfile ? JSON.stringify(existingProfile, null, 2) : "No existing profile — this is the first session."}

Generate a JSON object with these fields (all strings):
{
  "summary": "2-3 sentence summary of what was discussed and any shifts that happened",
  "topics": "comma-separated list of main topics",
  "insights": "key insights or realisations from this session",
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

  let parsed: {
    summary?: string;
    topics?: string;
    insights?: string;
    newCommitments?: string;
    profileUpdates?: Record<string, string>;
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    return Response.json({ error: "Failed to parse summary" }, { status: 500 });
  }

  // Save session
  const sessionId = await saveEdgeSession({
    mood,
    summary: parsed.summary,
    topics: parsed.topics,
    insights: parsed.insights,
    newCommitments: parsed.newCommitments,
    messageCount: messages.filter((m: { role: string }) => m.role !== "system").length,
  });

  // Update profile
  if (parsed.profileUpdates) {
    const currentProfile = await getEdgeProfile();
    await saveEdgeProfile({
      ...parsed.profileUpdates,
      totalSessions: (currentProfile?.totalSessions ?? 0) + 1,
      lastMood: mood,
      lastSessionDate: new Date().toISOString().split("T")[0],
    });
  }

  return Response.json({ sessionId, summary: parsed.summary });
}
