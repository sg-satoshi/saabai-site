import { getRedis } from "./redis";

export interface PortalSettings {
  agentName?: string;
  primaryGoal?: string;
  successDefinition?: string;
  targetClient?: string;
  desiredOutcomes?: string[];
  formalityLevel?: number;
  warmthLevel?: number;
  humorLevel?: number;
  responseLength?: "concise" | "balanced" | "detailed";
  personalityTraits?: string[];
  skillPacks?: string[];
  alwaysSay?: string[];
  neverSay?: string[];
  instructionLog?: { text: string; ts: string }[];
  // The Lawyer Behind the Agent
  birthYear?: string;
  practiceFocus?: string;
  careerBackground?: string;
  educationBackground?: string;
  formativeInfluences?: string;
  legalPhilosophy?: string;
  // Style Coach
  writingPersona?: string;
  clientAddress?: "first-name" | "mr-ms" | "formal";
  contractions?: "always" | "sometimes" | "never";
  sentenceLength?: "short" | "medium" | "long";
  legalLatin?: "never" | "sometimes" | "often";
  openingStyle?: string;
  badNewsStyle?: string;
  signOff?: string;
  writingSamples?: { label: string; text: string }[];
}

const SKILL_PACK_INSTRUCTIONS: Record<string, string> = {
  "sales-conversion":
    "Use consultative selling — understand the client's situation fully before suggesting next steps. Create natural momentum toward booking.",
  "objection-handling":
    "When clients hesitate (cost, time, uncertainty), acknowledge their concern directly, reframe it, and offer a low-commitment next step.",
  "rapport-building":
    "Mirror the client's emotional register. Validate before advising. Make them feel heard before making any ask.",
  "appointment-setting":
    "Aim to get a specific time commitment, not a vague 'yes'. Use assumptive language: 'Would Tuesday or Wednesday work for you?'",
  "lead-qualification":
    "Before capturing details, understand: what happened, what they need, and how urgent it is.",
  "active-listening":
    "Reflect back what the client said before responding. Use phrases like 'It sounds like...' and 'What I'm hearing is...'",
  "urgency-framing":
    "Gently highlight the cost of inaction when appropriate. Deadlines, escalating complexity, and missed opportunities are real.",
  "premium-positioning":
    "Never apologise for fees. Emphasise outcomes and expertise. Position the firm as a trusted partner, not a service provider.",
};

const RESPONSE_LENGTH_LABELS: Record<string, string> = {
  concise: "Concise = 1-2 sentences",
  balanced: "Balanced = 2-4 sentences",
  detailed: "Detailed = thorough paragraphs",
};

export async function getPortalSettings(email: string): Promise<PortalSettings | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get(`portal:settings:${email}`);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed as PortalSettings;
  } catch {
    return null;
  }
}

export function buildSystemPromptAddition(s: PortalSettings): string {
  const lines: string[] = [
    "",
    "--- FIRM CONFIGURATION ---",
    "",
    "[FORMATTING -- NON-NEGOTIABLE]",
    "Never use asterisks, bold (**text**), headers (##), or any markdown symbols. They render as raw characters.",
    "Never use em dashes. Use a comma, a full stop, or rewrite the sentence.",
    "Write in plain prose only. Break after every 1 or 2 sentences with a blank line. Short paragraphs. No walls of text.",
    "For numbered lists, give each item its own paragraph with a blank line before each number. Never run numbered points together in one block.",
  ];

  // Who This Lawyer Is
  const hasLawyerProfile =
    s.birthYear || s.practiceFocus || s.careerBackground ||
    s.educationBackground || s.formativeInfluences || s.legalPhilosophy;
  if (hasLawyerProfile) {
    lines.push("");
    lines.push("[WHO THIS LAWYER IS]");
    if (s.birthYear) lines.push(`Birth Year / Generation: ${s.birthYear} — consider the formative era, ideas current at the time, education system and cultural context of that period`);
    if (s.practiceFocus) lines.push(`Practice Focus: ${s.practiceFocus}`);
    if (s.careerBackground) lines.push(`Career Background: ${s.careerBackground}`);
    if (s.educationBackground) lines.push(`Education: ${s.educationBackground}`);
    if (s.formativeInfluences) lines.push(`Formative Influences (books, mentors, cases): ${s.formativeInfluences}`);
    if (s.legalPhilosophy) lines.push(`Legal Philosophy: ${s.legalPhilosophy}`);
  }

  // Goals
  const hasGoals =
    s.primaryGoal || s.successDefinition || s.targetClient || (s.desiredOutcomes?.length ?? 0) > 0;
  if (hasGoals) {
    lines.push("");
    lines.push("[GOALS]");
    if (s.primaryGoal) lines.push(`Primary Goal: ${s.primaryGoal}`);
    if (s.successDefinition) lines.push(`Successful Conversation: ${s.successDefinition}`);
    if (s.targetClient) lines.push(`Ideal Client: ${s.targetClient}`);
    if (s.desiredOutcomes?.length) {
      const formatted = s.desiredOutcomes.map((o, i) => `${i + 1}. ${o}`).join("  ");
      lines.push(`Desired Outcomes (in priority order): ${formatted}`);
    }
  }

  // Personality
  const hasPersonality =
    s.personalityTraits?.length ||
    s.formalityLevel !== undefined ||
    s.warmthLevel !== undefined ||
    s.humorLevel !== undefined ||
    s.responseLength;
  if (hasPersonality) {
    lines.push("");
    lines.push("[PERSONALITY]");
    if (s.personalityTraits?.length) lines.push(`Traits: ${s.personalityTraits.join(", ")}`);
    const toneTokens: string[] = [];
    if (s.formalityLevel !== undefined) toneTokens.push(`Formality: ${s.formalityLevel}/100`);
    if (s.warmthLevel !== undefined) toneTokens.push(`Warmth: ${s.warmthLevel}/100`);
    if (s.humorLevel !== undefined) toneTokens.push(`Humour: ${s.humorLevel}/100`);
    if (toneTokens.length) lines.push(toneTokens.join("  "));
    if (s.responseLength) {
      const label = RESPONSE_LENGTH_LABELS[s.responseLength] ?? s.responseLength;
      lines.push(`Response Length: ${s.responseLength} — [${label}]`);
    }
  }

  // Skill packs
  if (s.skillPacks?.length) {
    lines.push("");
    lines.push("[SKILL PACKS ACTIVE]");
    for (const pack of s.skillPacks) {
      const instruction = SKILL_PACK_INSTRUCTIONS[pack];
      if (instruction) {
        lines.push(`- ${pack}: "${instruction}"`);
      } else {
        lines.push(`- ${pack}`);
      }
    }
  }

  // Language rules
  const hasLanguageRules = (s.alwaysSay?.length ?? 0) > 0 || (s.neverSay?.length ?? 0) > 0;
  if (hasLanguageRules) {
    lines.push("");
    lines.push("[LANGUAGE RULES]");
    if (s.alwaysSay?.length) lines.push(`Always say: ${s.alwaysSay.join(", ")}`);
    if (s.neverSay?.length) lines.push(`Never say / avoid: ${s.neverSay.join(", ")}`);
  }

  // Writing Style — compiled from Style Coach
  const hasWritingStyle =
    s.writingPersona || s.clientAddress || s.contractions || s.sentenceLength ||
    s.legalLatin || s.openingStyle || s.badNewsStyle || s.signOff ||
    (s.writingSamples?.length ?? 0) > 0;

  if (hasWritingStyle) {
    lines.push("");
    lines.push("[WRITING STYLE — FOLLOW PRECISELY]");
    lines.push("This section defines how the senior lawyer writes. Mirror this style exactly in every response.");

    if (s.writingPersona) {
      lines.push("");
      lines.push(`Writing Persona: ${s.writingPersona}`);
    }

    const styleAttrs: string[] = [];
    if (s.clientAddress) {
      const addressMap = { "first-name": "first name only (e.g. 'Hi James')", "mr-ms": "Mr/Ms Surname (e.g. 'Dear Mr Thompson')", "formal": "full formal name" };
      styleAttrs.push(`Address clients by: ${addressMap[s.clientAddress]}`);
    }
    if (s.contractions) {
      const contractMap = { never: "never use contractions — always write 'do not', 'cannot', 'it is'", sometimes: "use contractions only in informal contexts", always: "use contractions freely for a conversational register" };
      styleAttrs.push(`Contractions: ${contractMap[s.contractions]}`);
    }
    if (s.sentenceLength) {
      const lengthMap = { short: "short, punchy sentences — direct and minimal", medium: "balanced sentence length — professional standard", long: "longer, detailed sentences — thorough reasoning" };
      styleAttrs.push(`Sentence length: ${lengthMap[s.sentenceLength]}`);
    }
    if (s.legalLatin) {
      const latinMap = { never: "never use legal Latin — plain English always", sometimes: "use legal Latin only when it is the most precise term", often: "use legal Latin freely as part of professional register" };
      styleAttrs.push(`Legal Latin: ${latinMap[s.legalLatin]}`);
    }
    if (styleAttrs.length) lines.push(...styleAttrs);

    if (s.openingStyle) lines.push(`Opening style: ${s.openingStyle}`);
    if (s.badNewsStyle) lines.push(`Delivering bad news: ${s.badNewsStyle}`);
    if (s.signOff) lines.push(`Sign-off / closing: ${s.signOff}`);

    if (s.writingSamples?.length) {
      lines.push("");
      lines.push("Writing Samples — study these and replicate this exact style, tone, phrasing, and rhythm:");
      s.writingSamples.forEach((sample, i) => {
        lines.push("");
        lines.push(`Sample ${i + 1}${sample.label ? ` (${sample.label})` : ""}:`);
        lines.push(`"${sample.text}"`);
      });
    }
  }

  // Custom instructions — newest-first
  if (s.instructionLog?.length) {
    lines.push("");
    lines.push("[CUSTOM INSTRUCTIONS]");
    const reversed = [...s.instructionLog].reverse();
    reversed.forEach((entry, i) => {
      const n = s.instructionLog!.length - i;
      const date = entry.ts ? new Date(entry.ts).toLocaleDateString("en-AU") : "";
      lines.push(`Amendment ${n} (${date}): ${entry.text}`);
    });
  }

  lines.push("");
  lines.push("--- END FIRM CONFIGURATION ---");

  return lines.join("\n");
}
