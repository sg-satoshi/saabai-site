# Rex playbook — "update for rex"

> Read whenever Shane says "update for rex", "new update for rex", or anything about PlasticOnline pricing/knowledge.
> Client: PlasticOnline — plasticonline.com.au — (07) 5564 6744. Contact: Daniel.

## Update pipeline
1. **Pricing source**: the newest supplier `.xlsx` in `/Users/aiworkspace/Downloads` (e.g. "HDPE Sheet UPDATED <Month Year>.xlsx"). Look there FIRST — don't ask where the file is.
2. **Where knowledge lives**: product/pricing knowledge in `lib/rex-knowledge.ts`; prompt/behaviour rules in `lib/rex-config.ts`.
3. **Always also check `calculatePrice`** in `lib/woo-client.ts` applies the same rule — a business-rule change must be fixed in EVERY occurrence in one grep pass, not just the quoted spot.
4. **Git**: `git pull` first (Daniel may have pushed), then push to BOTH remotes: sg-satoshi/rex AND dhargraves1987-sys/rex.
5. **Changelogs — TWO places**: saabai.ai/rex-changelog (auto via post-commit hook in this repo — don't hand-edit) AND the PLON repo changelog.
6. **Report when live**, with what changed.

## Rex business rules — never violate
- **Corflute**: full sheets only, NO cut-to-size. Custom sizes → tell the customer to call (07) 5564 6744 for a customised quote.
- **PETG**: full sheets only.
- **Cutting fees**: NEVER mention $30/$35 cutting fees or "X cuts included" — cutting is built into the price; Rex must not add it to quotes either.
- **Non-rectangular shapes**: material-only quotes are allowed but must EXPLICITLY exclude laser cutting/routing; otherwise direct to contact/checkout.
- **Minimum order**: AUD $50 Ex GST.
- **Standard sheet**: 2440×1220mm; oversized sheets attract a fee.
