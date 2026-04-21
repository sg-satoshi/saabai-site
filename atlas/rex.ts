const { OpenAI } = require("openai");
const readline = require("readline");

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const MODEL = "grok-4";

const SYSTEM_PROMPT = `
You are Rex, a friendly, witty, and highly capable AI assistant for the Saabai project.
You can chat naturally, answer questions, give advice, and help with coding tasks.
Be helpful, engaging, and a bit fun.
`;

let conversationHistory: Array<{role: string, content: string}> = [];

async function getGrokResponse(userMessage: string): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const reply = response.choices[0]?.message?.content?.trim() || "Sorry, I missed that.";

  conversationHistory.push({ role: "user", content: userMessage });
  conversationHistory.push({ role: "assistant", content: reply });

  if (conversationHistory.length > 30) {
    conversationHistory = conversationHistory.slice(-30);
  }

  return reply;
}

async function startRex() {
  console.log("🚀 Rex is ready! Chat with me naturally.");
  console.log("Type 'exit' or 'quit' to stop.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = () => {
    rl.question("You: ", async (input: string) => {
      const trimmed = input.trim();

      if (["exit", "quit"].includes(trimmed.toLowerCase())) {
        console.log("👋 Goodbye! See you later.");
        rl.close();
        return;
      }

      try {
        const reply = await getGrokResponse(trimmed);
        console.log(`\nRex: ${reply}\n`);
      } catch (err: any) {
        console.error("❌ Error talking to Grok:", err.message || err);
      }

      ask();
    });
  };

  ask();
}

startRex().catch((err: any) => {
  console.error("Failed to start Rex:", err.message || err);
});
