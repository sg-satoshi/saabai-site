You are reviewing a change to the Saabai site.

Run a full pre-commit code review. Do the following steps in order:

**Step 1 — Get the diff**
- `git diff HEAD`
- `git diff --cached`
- `git diff origin/main...HEAD`

**Step 2 — Deep-read any touched critical files**
Read shared chat, lead, auth, and client-site files in full when the diff touches them. Client sites (Stu's Cycle, Nico Moretti, Heaven Thai Massage, Wholesale Homes, Tributum) must keep their current routes and model selection.

**Step 3 — Evaluate against these criteria**

SHARED BEHAVIOUR
- Does a removed branch change the fallback used by another client?
- Do Mia, Lex, and site-factory chats still resolve models only through `lib/chat-config.ts` (`getDefaultModel`, `getPremiumModel`, `getSaabaiModel`)?
- Does any change post to `/api/leads` or `/api/site-factory/lead` from a path that did not already?

BUILD SAFETY
- TypeScript type errors, missing imports, wrong return types?
- Cron routes still check `Authorization: Bearer ${CRON_SECRET}`?
- `npm run predeploy` passes?

**Step 4 — Report**
List blocking issues first. If there are none, say so and list residual risk.
