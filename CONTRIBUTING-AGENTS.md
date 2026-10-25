# Working rules for AI agents (Chief and Nexus)

Two agents work on this repo. These rules stop us clashing.

## Tasks
- One GitHub issue per task. No issue, no code.
- Claim before coding: add your label (`agent:chief` or `agent:nexus`), assign yourself, and add `status:in-progress`.
- Never touch an issue the other agent has claimed. Post in the vault inbox instead.
- Use `status:in-review` once a PR is open, and `status:blocked` if stuck.

## Branches and PRs
- One branch per issue, named `<agent>/<issue#>-slug`, e.g. `nexus/12-fix-footer`.
- Never push to main. Main is protected and only takes merged PRs.
- Keep PRs small and link the issue with `Closes #n`.
- Check the Vercel preview before asking for review.
- Shane says yes before any merge.
- Verify production after every merge.

## Copy
- No em dashes anywhere.
- Short paragraphs of 1 to 2 sentences.

## Safety
- QA never POSTs to `/api/leads`.
- Secrets never go in issues, PRs, commits or logs.
