# Clients, accounts & ops facts

> Read when a task touches a specific client, DNS, admin logins, or Shane's accounts.

## Clients
- **Nico Moretti** — nicomoretti.au. Adelaide male companion. Dark-luxury gold (#f2ca50), Playfair Display + Manrope. Leads → nicomorettipersonal@gmail.com (fallback shanegoldberg@pm.me). ONLY use approved photos where Nico faces away from camera (`nico-moretti-standing.png`, `nico-moretti-studio.png`).
- **BO Consulting** — boconsulting.com.au. Australian blue-collar recruitment. Deep Navy #123B5D / Safety Orange #F58220 / Steel Grey #5C6670, white background. Chatbot "Christina". Leads via Resend → info@boconsulting.com.au. Must NOT look like a traditional recruitment agency.
- **PlasticOnline (Rex)** — see `docs/claude/rex-playbook.md`.
- **Wholesale Homes** — wholesalehomes.com.au (pages in this repo). Ink colour on light pages: #1A2B3C.
- Chatbot/FAQ reference implementations: heaven-thai-massage, lifestyle-money-management.
- Real case-study clients (never fabricate results): Plastic Online, Holland Plastics, Local Search, Ink FX Printing.

## Accounts & ops
- GitHub: sg-satoshi. Client repos private by default. Claude never emails clients directly — Shane forwards deliverables from hello@saabai.ai.
- Shane's emails: hello@saabai.ai (business), shanegoldberg@pm.me (personal).
- Admin: hello@saabai.ai at saabai.ai/saabai-admin. Rotate password: `node scripts/rotate-admin-password.mjs '<pw>'`. Client passwords live in Vercel env vars.
- Vercel DNS for client domains: A `@ 76.76.21.21`, CNAME `www cname.vercel-dns.com`. The `vca_` token is a CLI token, NOT a REST bearer token. Vercel bot protection 403s curl on custom domains — verify via browser.
- Upstash Redis creds in `.env.local`. Site registry: `HSET saabai:sites <slug> <json>` (hash, NOT string key); custom domains in `saabai:domain-map`.

## Design workflow (settled — don't propose new tooling)
- Shane mocks up in the Google Stitch web UI and hands over a URL / pasted HTML / zip from `~/Downloads`. Treat as inspiration, not pixel spec; default to lean builds.
- Stitch image URLs (`lh3.googleusercontent.com/aida-public`) expire — always rehost.
- Alphabetical order for user-facing lists. New page sections also get a top-nav menu item.
