import { resolveReviewActor } from "./lex-review-access";

/** Who is calling and which firm's matters they see. Admins share one "saabai-admin" workspace. */
export async function matterActor(req: Request): Promise<{ firm: string; by: string } | null> {
  const a = await resolveReviewActor(req);
  if (!a) return null;
  return a.kind === "firm" ? { firm: a.firm, by: a.email } : { firm: "saabai-admin", by: `admin:${a.id}` };
}

export const json = (status: number, body: unknown) => Response.json(body, { status });
