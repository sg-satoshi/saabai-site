const { OpenAI } = require("openai");
const readline = require("readline");

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const MODEL = "grok-4";

console.log("🚀 Starting Conversational Atlas...");

const SYSTEM_PROMPT = `
You are Atlas, the main personal orchestrator for Saabai.
You are technical, helpful, and direct.
You can inspect code, update files, run builds, and execute plans.

Respond naturally to the user.
Only when the user wants you to do real work, reply with clean JSON like this:
{
  "type": "action",
  "rawInput": "the full request to send to handleInput"
}
Otherwise just reply normally.
`;

let chatHistory: Array<{role: string, content: string}> = [];

async function getResponse(message: string) {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message }
    ],
    temperature: 0.7,
  });

  const reply = res.choices[0].message.content.trim();
  
  chatHistory.push({ role: "user", content: message });
  chatHistory.push({ role: "assistant", content: reply });
  
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
  }
  
  return reply;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("✅ Conversational Atlas is ready!");
console.log("Talk to me naturally. Type 'exit' to quit.\n");

const ask = () => {
  rl.question("You: ", async (input: string) => {
    const trimmed = input.trim();
    if (["exit", "quit"].includes(trimmed.toLowerCase())) {
      console.log("👋 Goodbye!");
      rl.close();
      return;
    }

    try {
      const reply = await getResponse(trimmed);
      console.log(`\nAtlas: ${reply}\n`);
    } catch (err: any) {
      console.error("❌ Error:", err.message || err);
    }

    ask();
  });
};

ask();
