export const runtime = "edge";

export async function GET() {
  const checks = {
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    heygen: !!process.env.HEYGEN_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    claude: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    elevenlabsVoice: !!process.env.ELEVENLABS_VOICE_ID,
  };
  return Response.json(checks);
}
