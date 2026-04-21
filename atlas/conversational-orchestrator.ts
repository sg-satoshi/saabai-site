const { OpenAI } = require("openai");
const readline = require("readline");

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const MODEL = "grok-4";

// Import your Atlas handler
const atlasModule = require("./atlas");
const { handleInput } = atlasModule;

const SYSTEM_PROMPT = `
You are Rex, a friendly, witty, and highly capable conversational front-end for Saabai's Atlas system.

- Chat naturally and helpfully with the user.
- Only when the user clearly wants Atlas to take action (inspect, update, build, fix, run something, etc.), respond with **nothing but** this exact JSON:
{
  "type": "action",
  "rawInput": "the full text to send to Atlas handleInput()"
}

Do not add any extra text when triggering an action.
Keep normal replies as plain text.
`;

let conversationHistory: any[] = [];

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

async function executeWithAtlas(rawInput: string): Promise<void> {
  console.log(`\n🔧 Passing to Atlas → ${rawInput}`);
  try {
    await handleInput(rawInput);
  } catch (err: any) {
    console.error("Atlas execution error:", err.message || err);
  }
}

async function startRex() {
  console.log("🚀 Rex (Grok conversational layer) is live on top of Atlas!");
  console.log("Talk naturally. Type 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = () => {
    rl.question("You: ", async (input: string) => {
      const trimmed = input.trim();
      if (["exit", "quit"].includes(trimmed.toLowerCase())) {
        console.log("👋 Goodbye!");
        rl.close();
        return;
      }

      try {
        const reply = await getGrokResponse(trimmed);

        if (reply.trim().startsWith("{") && reply.trim().endsWith("}")) {
          try {
            const action = JSON.parse(reply);
            if (action.type === "action" && action.rawInput) {
              await executeWithAtlas(action.rawInput);
            } else {
              console.log(`\nRex: ${reply}\n`);
            }
          } catch (e) {
            console.log(`\nRex: ${reply}\n`);
          }
        } else {
          console.log(`\nRex: ${reply}\n`);
        }
      } catch (err: any) {
        console.error("❌ Grok error:", err.message || err);
      }

      ask();
    });
  };

  ask();
}

startRex().catch(console.error);
