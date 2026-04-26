import { Resend } from "resend";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { saveNurtureRecord } from "../../../lib/redis";

export const runtime = "nodejs";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

function formatCurrency(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatNumber(n: number) {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

// ── Conversation analysis via Claude Haiku ────────────────────────────────────

interface ConversationAnalysis {
  summary: string;
  who: string;
  business: string;
  pain_points: string[];
  qualification: "hot" | "warm" | "cold";
  intent: string;
  key_insight: string;
  recommended_action: string;
}

async function analyseConversation(
  conversation: { role: string; content: string }[],
): Promise<ConversationAnalysis | null> {
  if (conversation.filter((m) => m.role === "user").length < 2) return null;

  const transcript = conversation
    .filter((m) => m.content.trim())
    .map((m) => `${m.role === "assistant" ? "Mia" : "Visitor"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `You are analysing a sales conversation between Mia (Saabai's AI assistant) and a website visitor. Saabai sells AI automation to professional services businesses. The goal of each conversation is to book a free strategy call.

Analyse the conversation below and return a JSON object only — no other text.

Conversation:
${transcript}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain-English summary of the conversation and where it ended up",
  "who": "Visitor's name if known, otherwise 'Unknown'",
  "business": "What kind of business they run or work in. One sentence.",
  "pain_points": ["Key pain point 1", "Key pain point 2"],
  "qualification": "hot | warm | cold — hot means ready to book or clearly qualified, warm means interested but not there yet, cold means low fit or disengaged",
  "intent": "What did the visitor actually want from this conversation? One sentence.",
  "key_insight": "The single most useful thing to know before following up. What stood out?",
  "recommended_action": "What should Shane do next? Be specific and direct."
}`,
    });

    const json = text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(json) as ConversationAnalysis;
  } catch {
    return null;
  }
}

function buildAnalysisHtml(analysis: ConversationAnalysis): string {
  const qualColour = analysis.qualification === "hot"
    ? { bg: "#0d3d1a", badge: "#22c55e", text: "#bbf7d0", label: "HOT" }
    : analysis.qualification === "warm"
    ? { bg: "#3d2a00", badge: "#f59e0b", text: "#fde68a", label: "WARM" }
    : { bg: "#1e1e2e", badge: "#6b7280", text: "#d1d5db", label: "COLD" };

  const painHtml = analysis.pain_points
    .map((p) => `<li style="margin-bottom: 4px; font-size: 13px; color: #555; line-height: 1.5;">${p}</li>`)
    .join("");

  return `
    <div style="background: #0b092e; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; border: 1px solid rgba(98,197,209,0.2);">
      <!-- Intel header row -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        <tr>
          <td style="vertical-align: middle;">
            <p style="color: #62c5d1; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; margin: 0;">Mia Intel</p>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <span style="display: inline-block; background: ${qualColour.badge}; color: #000; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; padding: 3px 10px; border-radius: 20px; text-transform: uppercase;">${qualColour.label}</span>
          </td>
        </tr>
      </table>

      <!-- Summary -->
      <p style="color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.6; margin: 0 0 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px;">${analysis.summary}</p>

      <!-- Fields grid -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 7px 0; vertical-align: top; width: 140px;">
            <span style="font-size: 11px; color: #62c5d1; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Who</span>
          </td>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 13px; color: rgba(255,255,255,0.8);">${analysis.who}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 0; vertical-align: top; width: 140px;">
            <span style="font-size: 11px; color: #62c5d1; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Business</span>
          </td>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 13px; color: rgba(255,255,255,0.8);">${analysis.business}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #62c5d1; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Intent</span>
          </td>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 13px; color: rgba(255,255,255,0.8);">${analysis.intent}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #62c5d1; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">Key insight</span>
          </td>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="font-size: 13px; color: rgba(255,255,255,0.8);">${analysis.key_insight}</span>
          </td>
        </tr>
      </table>

      ${painHtml ? `
      <!-- Pain points -->
      <div style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
        <p style="font-size: 11px; color: #62c5d1; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 8px;">Pain Points</p>
        <ul style="margin: 0; padding-left: 18px; color: rgba(255,255,255,0.75);">
          ${analysis.pain_points.map((p) => `<li style="margin-bottom: 4px; font-size: 13px; line-height: 1.5;">${p}</li>`).join("")}
        </ul>
      </div>` : ""}

      <!-- Recommended action — highlighted -->
      <div style="margin-top: 16px; background: rgba(98,197,209,0.1); border: 1px solid rgba(98,197,209,0.25); border-radius: 8px; padding: 14px 16px;">
        <p style="font-size: 10px; color: #62c5d1; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 6px;">Recommended Action</p>
        <p style="font-size: 14px; color: #ffffff; font-weight: 500; margin: 0; line-height: 1.5;">${analysis.recommended_action}</p>
      </div>
    </div>
  `;
}

// ── Operator notification: Mia chat lead ─────────────────────────────────────

function buildMiaEmail(lead: {
  name?: string;
  email: string;
  timestamp: string;
  conversation?: { role: string; content: string }[];
  analysis?: ConversationAnalysis | null;
}) {
  const { name, email, timestamp, conversation = [], analysis } = lead;

  const conversationHtml = conversation
    .map(({ role, content }) => {
      const isMia = role === "assistant";
      return `
        <div style="margin-bottom: 12px;">
          <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${isMia ? "#62c5d1" : "#888"}; margin: 0 0 4px;">
            ${isMia ? "Mia" : name || "Visitor"}
          </p>
          <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.6; padding: 10px 14px; background: ${isMia ? "#f0fafb" : "#f8f8f8"}; border-radius: 8px; border-left: 3px solid ${isMia ? "#62c5d1" : "#ddd"};">
            ${content}
          </p>
        </div>
      `;
    })
    .join("");

  return {
    subject: `New Lead via Mia — ${name || email}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0b092e; padding: 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Saabai · New Lead</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Mia captured a lead</h1>
        </div>
        <div style="background: #f8f8f8; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">
          ${analysis ? buildAnalysisHtml(analysis) : ""}
          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 120px;">Name</td><td style="padding: 6px 0; font-size: 14px; font-weight: 500;">${name || "Not provided"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Email</td><td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #62c5d1;">${email}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Time</td><td style="padding: 6px 0; font-size: 14px;">${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td></tr>
          </table>
          ${conversation.length > 0 ? `
            <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Conversation</h2>
            <div style="margin-bottom: 24px;">${conversationHtml}</div>
          ` : ""}
          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Reply to ${name || "Lead"} →</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Captured by Mia · saabai.ai</p>
        </div>
      </div>
    `,
  };
}

// ── Visitor follow-up email after Mia lead capture ───────────────────────────

function buildVisitorFollowUpEmail(lead: {
  name?: string;
  email: string;
  analysis?: ConversationAnalysis | null;
}) {
  const { name, analysis } = lead;
  const firstName = name?.split(" ")[0] || null;
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";

  const personalLine = analysis?.business
    ? `From what you shared about ${analysis.business.toLowerCase().replace(/\.$/, "")}, there's a real conversation to be had about what's automatable.`
    : "From our chat, it sounds like there are some real opportunities worth exploring.";

  return {
    subject: firstName ? `Good chatting with you, ${firstName}` : "Good chat — here's your next step",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">

        <div style="background: #0b092e; padding: 40px 40px 36px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; font-weight: 600;">Saabai · From Shane</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${greeting}</h1>
        </div>

        <div style="background: #f7f7f9; padding: 36px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">

          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 20px;">Thanks for chatting with Mia today. ${personalLine}</p>

          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">The free strategy call is the best next step — 30 minutes, no pitch, just a clear picture of what's possible for your business. I'll come in having already read your conversation with Mia, so you won't need to repeat yourself.</p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; letter-spacing: -0.01em;">Book Your Free 30-Min Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 36px;">Free · No obligation · Pick a time that works for you</p>

          <div style="border-top: 1px solid #e8e8ec; padding-top: 24px;">
            <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 6px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0;">Saabai · AI Automation for Professional Firms</p>
          </div>

        </div>
      </div>
    `,
  };
}

// ── Mia lead nurture — Day 2 ─────────────────────────────────────────────────

function buildMiaNurtureDay2Email(lead: {
  name?: string;
  email: string;
  business?: string;
  industry?: string;
}) {
  const { name, business, industry } = lead;
  const firstName = name?.split(" ")[0] || null;
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  const businessLine = business
    ? `I had another look at what you described — ${business.toLowerCase().replace(/\.$/, "")}.`
    : "I had another look at our chat from yesterday.";
  const industryNote = industry
    ? `Most ${industry.toLowerCase()} businesses we work with see the biggest gains in the first 60 days — the automatable work is usually hiding in plain sight.`
    : "Most businesses we work with see the biggest gains in the first 60 days — the automatable work is usually hiding in plain sight.";

  return {
    subject: firstName ? `${firstName}, quick one from Saabai` : "Quick one from Saabai",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Saabai · From Shane</p>
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">${greeting}</h1>
        </div>
        <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">${businessLine} ${industryNote}</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">The strategy call is 30 minutes and free. I come in prepared — I've already read your chat with Mia, so you don't start from scratch. You leave with a clear picture of what's automatable and what it costs. No pitch deck, no junior sales process.</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">If the timing's off, no worries. But if the problem's still there — which it usually is — this is the fastest way to understand what fixing it actually looks like.</p>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book Your Free Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · 30 minutes · No obligation</p>
          <div style="border-top: 1px solid #e8e8ec; padding-top: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 4px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0;">Saabai · AI Automation for Professional Firms</p>
          </div>
        </div>
      </div>
    `,
  };
}

// ── Mia lead nurture — Day 5 ─────────────────────────────────────────────────

function buildMiaNurtureDay5Email(lead: {
  name?: string;
  email: string;
  business?: string;
}) {
  const { name, business } = lead;
  const firstName = name?.split(" ")[0] || null;
  const greeting = firstName ? `${firstName},` : "One last one —";
  const context = business
    ? `From what you shared with Mia, there's a real automation opportunity in ${business.toLowerCase().replace(/\.$/, "")}.`
    : "From your chat with Mia, there are clear opportunities worth a proper look.";

  return {
    subject: firstName ? `Last one, ${firstName}` : "Last one from Saabai",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Saabai · From Shane</p>
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">${greeting}</h1>
        </div>
        <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">${context}</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">I won't keep following up after this — that's not how we operate. But if the problems you described are still there next week or next quarter — the call is free and the offer doesn't expire.</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">When the time's right, just book a time. I'll know who you are.</p>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book a Free Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · 30 minutes · Pick your time</p>
          <div style="border-top: 1px solid #e8e8ec; padding-top: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 4px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0;">Saabai · AI Automation for Professional Firms</p>
          </div>
        </div>
      </div>
    `,
  };
}

// ── Operator notification: calculator lead ───────────────────────────────────

function buildCalculatorOperatorEmail(lead: {
  email: string;
  timestamp: string;
  calculatorResults?: {
    teamMembers?: number;
    hoursPerWeek?: number;
    hourlyCost?: number;
    weeklyHours?: number;
    annualHours?: number;
    annualCost?: number;
  };
  source?: string;
}) {
  const { email, timestamp, calculatorResults = {}, source } = lead;
  const { teamMembers, hoursPerWeek, hourlyCost, weeklyHours, annualHours, annualCost } = calculatorResults;
  const page = source === "calculator_page" ? "Calculator Page" : "Homepage Calculator";

  return {
    subject: `Calculator Lead — ${email} (${annualCost ? formatCurrency(annualCost) + "/yr" : "estimate requested"})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0b092e; padding: 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Saabai · Calculator Lead</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Someone ran the numbers</h1>
        </div>
        <div style="background: #f8f8f8; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">

          ${annualCost ? `
          <div style="background: #0b092e; border-radius: 10px; padding: 24px; margin-bottom: 28px; text-align: center;">
            <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Their Estimated Annual Labour Cost</p>
            <p style="color: #ffffff; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">${formatCurrency(annualCost)}</p>
            <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin: 6px 0 0;">AUD per year in repetitive work</p>
          </div>
          ` : ""}

          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 180px;">Email</td><td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #62c5d1;">${email}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Source</td><td style="padding: 6px 0; font-size: 14px;">${page}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Time</td><td style="padding: 6px 0; font-size: 14px;">${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td></tr>
          </table>

          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Calculator Inputs</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 180px;">Team members</td><td style="padding: 6px 0; font-size: 14px;">${teamMembers ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Hours / week each</td><td style="padding: 6px 0; font-size: 14px;">${hoursPerWeek ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Hourly cost (AUD)</td><td style="padding: 6px 0; font-size: 14px;">${hourlyCost ? formatCurrency(hourlyCost) : "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Weekly hours total</td><td style="padding: 6px 0; font-size: 14px;">${weeklyHours ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Annual hours total</td><td style="padding: 6px 0; font-size: 14px;">${annualHours ?? "—"}</td></tr>
          </table>

          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Reply to Lead →</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Submitted via saabai.ai · ${page}</p>
        </div>
      </div>
    `,
  };
}

// ── Customer-facing: calculator results email ────────────────────────────────

function buildCalculatorCustomerEmail(lead: {
  email: string;
  calculatorResults?: {
    teamMembers?: number;
    hoursPerWeek?: number;
    hourlyCost?: number;
    weeklyHours?: number;
    annualHours?: number;
    annualCost?: number;
  };
}) {
  const { email, calculatorResults = {} } = lead;
  const { teamMembers, hoursPerWeek, hourlyCost, weeklyHours, annualHours, annualCost } = calculatorResults;

  const savingsLow  = annualCost ? formatCurrency(annualCost * 0.25) : null;
  const savingsHigh = annualCost ? formatCurrency(annualCost * 0.5)  : null;

  return {
    subject: annualCost
      ? `You're leaving ${formatCurrency(annualCost)} on the table every year`
      : `Your automation estimate from Saabai`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

        <!-- Header -->
        <div style="background: #0b092e; padding: 40px 40px 36px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; font-weight: 600;">Saabai · Your Cost Estimate</p>
          <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">Here are your numbers.</h1>
          <p style="color: rgba(255,255,255,0.55); font-size: 15px; margin: 0; line-height: 1.5;">Based on your inputs, here's what repetitive manual work is costing your business.</p>
        </div>

        <!-- Body -->
        <div style="background: #f7f7f9; padding: 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">

          ${annualCost ? `
          <!-- Hero number -->
          <div style="background: #0b092e; border-radius: 12px; padding: 32px; margin-bottom: 28px; text-align: center;">
            <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Estimated Annual Labour Cost</p>
            <p style="color: #ffffff; font-size: 52px; font-weight: 800; margin: 0; letter-spacing: -0.03em; line-height: 1;">${formatCurrency(annualCost)}</p>
            <p style="color: rgba(255,255,255,0.45); font-size: 13px; margin: 10px 0 0;">AUD per year spent on repetitive manual work</p>
          </div>

          <!-- Stats row -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 28px;">
            <tr>
              <td style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 18px 20px; width: 50%; vertical-align: top;">
                <p style="color: #62c5d1; font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em;">${weeklyHours ? formatNumber(weeklyHours) : "—"}</p>
                <p style="color: #888; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Hours / week</p>
              </td>
              <td style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 18px 20px; width: 50%; vertical-align: top;">
                <p style="color: #62c5d1; font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em;">${annualHours ? formatNumber(annualHours) : "—"}</p>
                <p style="color: #888; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Hours / year</p>
              </td>
            </tr>
          </table>

          <!-- Savings callout -->
          <div style="background: #ffffff; border: 1px solid #e8e8ec; border-left: 3px solid #62c5d1; border-radius: 10px; padding: 20px 22px; margin-bottom: 32px;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; letter-spacing: -0.01em;">What automation could recover</p>
            <p style="font-size: 15px; color: #444; margin: 0; line-height: 1.6;">Automating 25–50% of this workload could unlock <strong style="color: #0b092e;">${savingsLow}–${savingsHigh}</strong> in annual savings — without adding headcount.</p>
          </div>
          ` : ""}

          <!-- Your inputs -->
          <h2 style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #e8e8ec;">Your Inputs</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 9px 0; color: #999; font-size: 13px; width: 55%;">Team members on manual tasks</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${teamMembers ?? "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 9px 0; color: #999; font-size: 13px;">Hours per week each</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${hoursPerWeek ?? "—"} hrs</td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #999; font-size: 13px;">Average hourly cost</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${hourlyCost ? formatCurrency(hourlyCost) : "—"}/hr</td>
            </tr>
          </table>

          <!-- Primary CTA -->
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; letter-spacing: -0.01em;">Book Your Free 30-Min Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · No obligation · We'll show you exactly what's automatable in your business</p>

          <!-- What to expect -->
          <div style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 24px; margin-bottom: 32px;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 14px; letter-spacing: -0.01em;">What happens on the call</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 24px;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">01</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">We map your biggest time drains — where the hours actually go</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">02</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">We show you what's automatable in your specific workflow</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">03</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">You leave with a clear picture of what's possible — and what it costs</td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ec;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; letter-spacing: -0.01em;">Saabai</p>
            <p style="font-size: 12px; color: #bbb; margin: 0;">AI Automation for Professional Firms · Australia</p>
            <p style="font-size: 12px; color: #ccc; margin: 10px 0 0;">You requested this estimate at saabai.ai. Questions? Reply to this email.</p>
          </div>

        </div>
      </div>
    `,
  };
}

// ── Chat transcript emails ────────────────────────────────────────────────────

function buildChatBubblesHtml(
  conversation: { role: string; content: string }[],
  visitorName?: string,
) {
  return conversation
    .filter((m) => m.content.trim())
    .map(({ role, content }) => {
      const isMia = role === "assistant";
      const label = isMia ? "Mia" : visitorName || "You";

      if (isMia) {
        return `
          <tr>
            <td style="padding: 4px 0 8px;">
              <table style="border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: bottom; padding-right: 8px; width: 28px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: #1c1a52; border: 1px solid rgba(98,197,209,0.3); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 28px; font-size: 11px; font-weight: 700; color: #62c5d1;">M</div>
                  </td>
                  <td>
                    <div style="font-size: 10px; font-weight: 600; color: #62c5d1; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">${label}</div>
                    <div style="background: #1c1a52; color: #d8d8f0; padding: 11px 15px; border-radius: 4px 16px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; display: inline-block;">${content}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      } else {
        return `
          <tr>
            <td style="padding: 4px 0 8px; text-align: right;">
              <div style="font-size: 10px; font-weight: 600; color: #888; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; text-align: right;">${label}</div>
              <div style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 11px 15px; border-radius: 16px 4px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; text-align: left;">${content}</div>
            </td>
          </tr>`;
      }
    })
    .join("");
}

function buildTranscriptShell({
  heading,
  subheading,
  eyebrow,
  bubblesHtml,
  analysisHtml,
  ctaHtml,
  footerNote,
}: {
  heading: string;
  subheading: string;
  eyebrow: string;
  bubblesHtml: string;
  analysisHtml?: string;
  ctaHtml?: string;
  footerNote: string;
}) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: #0b092e; padding: 40px 40px 36px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
        <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; font-weight: 600;">${eyebrow}</p>
        <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">${heading}</h1>
        <p style="color: rgba(255,255,255,0.55); font-size: 14px; margin: 0; line-height: 1.5;">${subheading}</p>
      </div>

      <!-- Body -->
      <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">

        ${analysisHtml ?? ""}

        <!-- Chat bubbles -->
        <div style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${bubblesHtml}
          </table>
        </div>

        ${ctaHtml ?? ""}

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ec;">
          <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px;">Saabai</p>
          <p style="font-size: 12px; color: #bbb; margin: 0;">AI Automation for Professional Firms · Australia</p>
          <p style="font-size: 12px; color: #ccc; margin: 10px 0 0;">${footerNote}</p>
        </div>
      </div>
    </div>
  `;
}

// Operator transcript — fires when widget is closed with genuine dialogue
function buildOperatorTranscriptEmail(lead: {
  timestamp: string;
  source?: string;
  email?: string;
  conversation?: { role: string; content: string }[];
  analysis?: ConversationAnalysis | null;
}) {
  const { timestamp, source, email, conversation = [], analysis } = lead;
  const userCount = conversation.filter((m) => m.role === "user").length;
  const bubblesHtml = buildChatBubblesHtml(conversation);
  const intentional = source === "chat_ended";

  const contactRow = email
    ? `<div style="background:#ffffff;border:1px solid #e8e8ec;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:12px;color:#999;min-width:80px;">Visitor email</span>
        <a href="mailto:${email}" style="font-size:14px;font-weight:600;color:#62c5d1;text-decoration:none;">${email}</a>
       </div>`
    : `<div style="background:#ffffff;border:1px solid #e8e8ec;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <span style="font-size:12px;color:#bbb;">No email provided</span>
       </div>`;

  return {
    subject: `Mia transcript — ${email ?? "anonymous"} · ${userCount} messages`,
    html: buildTranscriptShell({
      eyebrow: "Saabai · Mia Transcript",
      heading: intentional ? "A visitor ended the conversation." : "A conversation was closed.",
      subheading: `${userCount} messages · ${intentional ? "Visitor clicked End chat" : "Widget closed without ending"}`,
      analysisHtml: analysis ? buildAnalysisHtml(analysis) : undefined,
      bubblesHtml: contactRow + bubblesHtml,
      footerNote: "Sent automatically after a Mia conversation ends.",
    }),
  };
}

// Customer transcript — sent when they opt in via the lead capture form
function buildCustomerTranscriptEmail(lead: {
  name?: string;
  email: string;
  conversation?: { role: string; content: string }[];
}) {
  const { name, email, conversation = [] } = lead;

  const ctaHtml = `
    <div style="text-align: center; margin-bottom: 28px;">
      <p style="font-size: 15px; color: #444; margin: 0 0 20px; line-height: 1.6;">Ready to put these ideas into action? Book a free 30-minute strategy call — we'll map out exactly what can be automated in your business.</p>
      <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; letter-spacing: -0.01em;">Book Your Free Strategy Call →</a>
      <p style="font-size: 12px; color: #aaa; margin: 12px 0 0;">Free · 30 minutes · No obligation</p>
    </div>
  `;

  return {
    subject: `Your conversation with Mia — ${name || "here's your transcript"}`,
    html: buildTranscriptShell({
      eyebrow: "Saabai · Your Conversation",
      heading: `Here's your chat with Mia${name ? `, ${name}` : ""}.`,
      subheading: "Everything you discussed — saved for your reference.",
      bubblesHtml: buildChatBubblesHtml(conversation, name),
      ctaHtml,
      footerNote: "You requested this transcript during your chat at saabai.ai. Questions? Reply to this email.",
    }),
  };
}

// ── Pete chat transcript emails ───────────────────────────────────────────────

function buildPeteOperatorEmail(lead: {
  timestamp: string;
  email?: string;
  conversation?: { role: string; content: string }[];
}) {
  const { timestamp, email, conversation = [] } = lead;
  const userCount = conversation.filter((m) => m.role === "user").length;

  const bubblesHtml = conversation
    .filter((m) => m.content.trim())
    .map(({ role, content }) => {
      const isPete = role === "assistant";
      if (isPete) {
        return `<tr><td style="padding: 4px 0 8px;">
          <table style="border-collapse: collapse;"><tr>
            <td style="vertical-align: bottom; padding-right: 8px; width: 28px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #1c1a52; border: 1px solid rgba(98,197,209,0.3); text-align: center; line-height: 28px; font-size: 11px; font-weight: 700; color: #62c5d1;">P</div>
            </td>
            <td>
              <div style="font-size: 10px; font-weight: 600; color: #62c5d1; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">Rex</div>
              <div style="background: #1c1a52; color: #d8d8f0; padding: 11px 15px; border-radius: 4px 16px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; display: inline-block;">${content}</div>
            </td>
          </tr></table>
        </td></tr>`;
      } else {
        return `<tr><td style="padding: 4px 0 8px; text-align: right;">
          <div style="font-size: 10px; font-weight: 600; color: #888; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; text-align: right;">${email ?? "Visitor"}</div>
          <div style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 11px 15px; border-radius: 16px 4px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; text-align: left;">${content}</div>
        </td></tr>`;
      }
    })
    .join("");

  const contactRow = email
    ? `<div style="background:#ffffff;border:1px solid #e8e8ec;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <span style="font-size:12px;color:#999;">Visitor email: </span>
        <a href="mailto:${email}" style="font-size:14px;font-weight:600;color:#62c5d1;text-decoration:none;">${email}</a>
       </div>`
    : `<div style="background:#ffffff;border:1px solid #e8e8ec;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <span style="font-size:12px;color:#bbb;">No email provided</span>
       </div>`;

  return {
    subject: `Rex transcript — ${email ?? "anonymous"} · ${userCount} messages · /onboarding/plon`,
    html: buildTranscriptShell({
      eyebrow: "Saabai · Rex Transcript",
      heading: "A visitor chatted with Rex.",
      subheading: `${userCount} visitor messages · /onboarding/plon · ${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}`,
      bubblesHtml: contactRow + bubblesHtml,
      footerNote: "Sent automatically after a Rex conversation ends.",
    }),
  };
}

function buildPeteCustomerTranscriptEmail(lead: {
  email: string;
  conversation?: { role: string; content: string }[];
}) {
  const { email, conversation = [] } = lead;

  const bubblesHtml = conversation
    .filter((m) => m.content.trim())
    .map(({ role, content }) => {
      const isPete = role === "assistant";
      const label = isPete ? "Rex" : "You";
      if (isPete) {
        return `<tr><td style="padding: 4px 0 8px;">
          <table style="border-collapse: collapse;"><tr>
            <td style="vertical-align: bottom; padding-right: 8px; width: 28px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #1c1a52; border: 1px solid rgba(98,197,209,0.3); text-align: center; line-height: 28px; font-size: 11px; font-weight: 700; color: #62c5d1;">P</div>
            </td>
            <td>
              <div style="font-size: 10px; font-weight: 600; color: #62c5d1; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">${label}</div>
              <div style="background: #1c1a52; color: #d8d8f0; padding: 11px 15px; border-radius: 4px 16px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; display: inline-block;">${content}</div>
            </td>
          </tr></table>
        </td></tr>`;
      } else {
        return `<tr><td style="padding: 4px 0 8px; text-align: right;">
          <div style="font-size: 10px; font-weight: 600; color: #888; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; text-align: right;">${label}</div>
          <div style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 11px 15px; border-radius: 16px 4px 16px 16px; font-size: 14px; line-height: 1.55; max-width: 340px; text-align: left;">${content}</div>
        </td></tr>`;
      }
    })
    .join("");

  const ctaHtml = `
    <div style="text-align: center; margin-bottom: 28px;">
      <p style="font-size: 15px; color: #444; margin: 0 0 20px; line-height: 1.6;">Thanks for chatting with Rex. Ready to see what we can automate for your business?</p>
      <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book Your Free Strategy Call →</a>
      <p style="font-size: 12px; color: #aaa; margin: 12px 0 0;">Free · 30 minutes · No obligation</p>
    </div>
  `;

  return {
    subject: "Your conversation with Rex — PlasticOnline",
    html: buildTranscriptShell({
      eyebrow: "PlasticOnline · From Rex",
      heading: "Here's your chat with Rex.",
      subheading: "Everything you discussed — saved for your reference.",
      bubblesHtml,
      ctaHtml,
      footerNote: "You requested this transcript during your chat. Questions? Reply to this email.",
    }),
  };
}

// ── Operator notification: Mia hot lead (show_booking_cta fired) ─────────────

function buildHotLeadEmail(lead: {
  name?: string;
  business?: string;
  industry?: string;
  team_size?: string;
  pain_points?: string[];
  qualification_summary: string;
  qualification_score?: number;
  business_fit?: boolean;
  pain_point_named?: boolean;
  automation_potential?: boolean;
  roiData?: {
    team_members: number;
    hours_per_person_per_week: number;
    hourly_rate: number;
    weeklyHours: number;
    annualHours: number;
    annualCost: number;
    monthlyCost: number;
    process_name?: string;
  };
  page: string;
  timestamp: string;
  conversation?: { role: string; content: string }[];
  analysis?: ConversationAnalysis | null;
}) {
  const {
    name,
    business,
    industry,
    team_size,
    pain_points = [],
    qualification_summary,
    qualification_score,
    business_fit,
    pain_point_named,
    automation_potential,
    roiData,
    page,
    timestamp,
    conversation = [],
    analysis,
  } = lead;

  const displayName = name || business || "a visitor";

  const signal = (flag: boolean | undefined, label: string) => {
    const tick = flag
      ? `<span style="color: #22c55e; font-weight: 700;">✓</span>`
      : `<span style="color: #6b7280;">–</span>`;
    return `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.7); width: 20px; vertical-align: middle;">${tick}</td>
        <td style="padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.8); vertical-align: middle;">${label}</td>
      </tr>`;
  };

  const roiBlock = roiData
    ? `
      <div style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="font-size: 10px; color: #22c55e; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 10px;">Annual Cost of Their Manual Work</p>
        <p style="font-size: 40px; font-weight: 800; color: #ffffff; margin: 0 0 4px; letter-spacing: -0.02em;">${formatCurrency(roiData.annualCost)}</p>
        <p style="font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 ${roiData.process_name ? "10px" : "0"};">AUD per year in repetitive work</p>
        ${roiData.process_name ? `<p style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 0;">Process: <em>${roiData.process_name}</em></p>` : ""}
      </div>`
    : "";

  const painHtml = pain_points.length
    ? `
      <div style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
        <p style="font-size: 10px; color: #62c5d1; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">Pain Points</p>
        <ul style="margin: 0; padding-left: 18px; color: rgba(255,255,255,0.75);">
          ${pain_points.map((p) => `<li style="margin-bottom: 4px; font-size: 13px; line-height: 1.5;">${p}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const bubblesHtml = buildChatBubblesHtml(conversation, name);

  const subject = `🔥 HOT LEAD — Mia qualified ${displayName} · Book now`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">

      <!-- Header -->
      <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #ef4444, transparent);"></div>
        <div style="display: inline-block; background: #ef4444; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 14px;">🔥 HOT LEAD</div>
        <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">Mia just qualified ${displayName}</h1>
        <p style="color: #f97316; font-size: 13px; font-weight: 600; margin: 0; letter-spacing: 0.02em;">Act within the hour — this is the hottest possible signal.</p>
      </div>

      <!-- Body -->
      <div style="background: #0b092e; padding: 32px 40px; border-bottom: 1px solid rgba(255,255,255,0.06);">

        <!-- Qualification summary -->
        <p style="font-size: 20px; color: #62c5d1; font-weight: 600; line-height: 1.5; margin: 0 0 28px; letter-spacing: -0.01em;">"${qualification_summary}"</p>

        ${roiBlock}

        <!-- Qualification signals -->
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
          <p style="font-size: 10px; color: #62c5d1; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 10px;">Qualification Signals${qualification_score != null ? ` · Score ${qualification_score}/3` : ""}</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${signal(business_fit, "Business fit confirmed")}
            ${signal(pain_point_named, "Pain point named")}
            ${signal(automation_potential, "Automation potential identified")}
          </table>
          ${painHtml}
        </div>

        <!-- Contact details -->
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
          <p style="font-size: 10px; color: #62c5d1; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 10px;">Contact</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px; width: 120px;">Name</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${name || "—"}</td></tr>
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px;">Business</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${business || "—"}</td></tr>
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px;">Industry</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${industry || "—"}</td></tr>
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px;">Team size</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${team_size || "—"}</td></tr>
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px;">Page</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${page}</td></tr>
            <tr><td style="padding: 5px 0; color: rgba(255,255,255,0.45); font-size: 12px;">Time</td><td style="padding: 5px 0; font-size: 13px; color: rgba(255,255,255,0.85);">${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td></tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${CALENDLY}" style="display: inline-block; background: #ef4444; color: #ffffff; padding: 16px 40px; border-radius: 10px; font-weight: 700; font-size: 16px; text-decoration: none; letter-spacing: -0.01em;">Reply or Book Call →</a>
        </div>

      </div>

      <!-- Analysis + transcript on white background -->
      <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">

        ${analysis ? buildAnalysisHtml(analysis) : ""}

        ${conversation.length > 0 ? `
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin: 0 0 14px;">Full Conversation</p>
        <div style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${bubblesHtml}
          </table>
        </div>` : ""}

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ec;">
          <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px;">Saabai</p>
          <p style="font-size: 12px; color: #bbb; margin: 0;">AI Automation for Professional Firms · Australia</p>
          <p style="font-size: 12px; color: #ccc; margin: 10px 0 0;">Sent automatically when Mia's booking CTA fires · saabai.ai</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const lead = await req.json();

  console.log("[lead captured]", JSON.stringify(lead));

  const isCalculator = lead.source?.startsWith("calculator");
  const isMiaQualified = lead.source === "mia_qualified";
  const isChatClosed = lead.source === "chat_closed" || lead.source === "chat_ended" || lead.source === "chat_ended_short";
  const isPeteClosed = lead.source === "pete_ended";

  if (process.env.RESEND_API_KEY) {

    if (isPeteClosed) {
      // Operator transcript — always send for Pete (client onboarding context)
      const { subject, html } = buildPeteOperatorEmail(lead);
      try {
        await resend.emails.send({
          from: "Saabai Leads <leads@saabai.ai>",
          to: ["hello@saabai.ai"],
          subject,
          html,
        });
      } catch (err) {
        console.error("[resend pete operator error]", err);
      }

      // Customer transcript — only if they opted in
      if (lead.sendTranscript && lead.email) {
        const { subject: txSubject, html: txHtml } = buildPeteCustomerTranscriptEmail(lead);
        try {
          await resend.emails.send({
            from: "Shane at Saabai.ai <hello@saabai.ai>",
            to: [lead.email],
            subject: txSubject,
            html: txHtml,
            replyTo: "hello@saabai.ai",
          });
        } catch (err) {
          console.error("[resend pete customer transcript error]", err);
        }
      }

    } else if (isMiaQualified) {
      // Hottest possible signal — Mia's show_booking_cta tool fired
      const analysis = await analyseConversation(lead.conversation ?? []);
      const { subject, html } = buildHotLeadEmail({ ...lead, analysis });
      try {
        await resend.emails.send({
          from: "Saabai Leads <leads@saabai.ai>",
          to: ["hello@saabai.ai"],
          subject,
          html,
        });
      } catch (err) {
        console.error("[resend hot lead error]", err);
      }

    } else if (isChatClosed) {
      // Operator transcript — skip for short conversations
      if (lead.source !== "chat_ended_short") {
        // Generate AI analysis before building the email
        const analysis = await analyseConversation(lead.conversation ?? []);
        const { subject, html } = buildOperatorTranscriptEmail({ ...lead, analysis });
        try {
          await resend.emails.send({
            from: "Saabai Leads <leads@saabai.ai>",
            to: ["hello@saabai.ai"],
            subject,
            html,
          });
        } catch (err) {
          console.error("[resend transcript error]", err);
        }
      }

      // Customer transcript — if they opted in via the end panel
      if (lead.sendTranscript && lead.email) {
        const { subject: txSubject, html: txHtml } = buildCustomerTranscriptEmail(lead);
        try {
          await resend.emails.send({
            from: "Shane at Saabai.ai <hello@saabai.ai>",
            to: [lead.email],
            subject: txSubject,
            html: txHtml,
            replyTo: "hello@saabai.ai",
          });
        } catch (err) {
          console.error("[resend customer transcript error]", err);
        }
      }
    } else {
      // Standard lead notification (Mia or calculator)
      if (isCalculator) {
        const { subject, html } = buildCalculatorOperatorEmail(lead);
        try {
          await resend.emails.send({
            from: "Saabai Leads <leads@saabai.ai>",
            to: ["hello@saabai.ai"],
            subject,
            html,
            replyTo: lead.email || undefined,
          });
        } catch (err) {
          console.error("[resend operator error]", err);
        }
      } else {
        // Mia lead capture — generate analysis
        const analysis = await analyseConversation(lead.conversation ?? []);
        const { subject, html } = buildMiaEmail({ ...lead, analysis });
        try {
          await resend.emails.send({
            from: "Saabai Leads <leads@saabai.ai>",
            to: ["hello@saabai.ai"],
            subject,
            html,
            replyTo: lead.email || undefined,
          });
        } catch (err) {
          console.error("[resend operator error]", err);
        }
      }

      // Customer emails
      if (isCalculator && lead.email) {
        const { subject: custSubject, html: custHtml } = buildCalculatorCustomerEmail(lead);
        try {
          await resend.emails.send({
            from: "Shane at Saabai.ai <hello@saabai.ai>",
            to: [lead.email],
            subject: custSubject,
            html: custHtml,
            replyTo: "hello@saabai.ai",
          });
        } catch (err) {
          console.error("[resend customer calculator error]", err);
        }
      }

      if (!isCalculator && lead.email && lead.sendTranscript) {
        const { subject: txSubject, html: txHtml } = buildCustomerTranscriptEmail(lead);
        try {
          await resend.emails.send({
            from: "Shane at Saabai.ai <hello@saabai.ai>",
            to: [lead.email],
            subject: txSubject,
            html: txHtml,
            replyTo: "hello@saabai.ai",
          });
        } catch (err) {
          console.error("[resend customer transcript error]", err);
        }
      }

      // Visitor follow-up — send when they didn't request a transcript (fills the gap)
      if (!isCalculator && lead.email && !lead.sendTranscript) {
        const analysis = await analyseConversation(lead.conversation ?? []);
        const { subject: fuSubject, html: fuHtml } = buildVisitorFollowUpEmail({ ...lead, analysis });
        try {
          await resend.emails.send({
            from: "Shane at Saabai.ai <hello@saabai.ai>",
            to: [lead.email],
            subject: fuSubject,
            html: fuHtml,
            replyTo: "hello@saabai.ai",
          });
        } catch (err) {
          console.error("[resend follow-up error]", err);
        }
      }

      // Enroll in nurture sequence — Day 2 and Day 5 emails via cron
      if (!isCalculator && lead.email) {
        saveNurtureRecord({
          email: lead.email,
          name: lead.name,
          business: lead.business,
          industry: lead.industry,
        }).catch(() => {});
      }
    }
  }

  // Keep webhook as silent fallback
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      console.error("[webhook error]", err);
    }
  }

  return Response.json({ ok: true });
}
