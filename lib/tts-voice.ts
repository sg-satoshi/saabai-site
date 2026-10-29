/** ElevenLabs voice ids are short alphanumerics. Anything else could rewrite the upstream URL path. */
export function isValidVoiceId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9]{10,40}$/.test(v);
}
