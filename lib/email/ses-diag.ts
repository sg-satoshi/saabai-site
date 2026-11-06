/**
 * Non-secret SES credential diagnostics. Never returns any part of the secret,
 * only its length. Key id: first 4 chars + length. Logged on SES failure and
 * appended to the failed email_sends row. Not exposed by any endpoint.
 */
function flags(v: string): string {
  const ws = /\s/.test(v) ? "ws" : "";
  const na = /[^\x20-\x7e]/.test(v) ? "nonascii" : "";
  return [ws, na].filter(Boolean).join("+") || "clean";
}

export function sesEnvDiag(env: NodeJS.ProcessEnv = process.env): string {
  const id = env.AWS_SES_ACCESS_KEY_ID ?? "";
  const secret = env.AWS_SES_SECRET_ACCESS_KEY ?? "";
  const region = env.AWS_SES_REGION ?? "";
  return [
    `id=${id.slice(0, 4)}/len${id.length}/${flags(id)}`,
    `secret=len${secret.length}/${flags(secret)}`,
    `region=${JSON.stringify(region.replace(/[^\x20-\x7e]/g, "?"))}/${flags(region)}`,
    `sess_tok=${Boolean(env.AWS_SESSION_TOKEN)}`,
    `aws_key_id=${Boolean(env.AWS_ACCESS_KEY_ID)}`,
    `vercel_env=${env.VERCEL_ENV ?? "none"}`,
    `dpl=${env.VERCEL_DEPLOYMENT_ID ?? "none"}`,
  ].join(" ");
}
