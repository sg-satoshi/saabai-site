# Saabai.ai Changelog

All notable changes to the Saabai.ai platform, products, and infrastructure.

Format: `YYYY-MM-DD — [Category] Description`

---

## 2026-05-10

### Infrastructure
- **feat:** Async Agent Task Queue (`lib/agent-queue.ts`) — Redis-based job queue for true asynchronous sub-agent execution
- **feat:** Deployment Pipeline with QA Gates (`lib/deploy-pipeline.ts`, `app/api/deploy/route.ts`) — build → test → approve → deploy → verify workflow
- **feat:** Deployment script (`scripts/deploy-site.sh`) — automated build, test, push, verify pipeline

### Lex (Legal AI)
- **feat:** Email delivery API (`app/api/lex-send/route.ts`) — send branded DOCX/review emails via Resend
- **feat:** Audit trail system (`lib/lex-audit.ts`) — fire-and-forget event logging for compliance
- **feat:** DOCX export dependency installed (`docx` package)

### Chatbots
- **fix:** NextInvestment chatbot (Sophie) — removed broken `convertToModelMessages`, added markdown rendering, improved error messages
- **fix:** LMM chatbot (Zara) — same fixes applied

---

*Previous entries would be backfilled here...*

---

## Categories

| Category | Description |
|----------|-------------|
| `lex` | Lex Legal AI product |
| `rex` | REX chatbot platform |
| `site-factory` | Site Factory / client sites |
| `infrastructure` | Platform, deployment, DevOps |
| `mission-control` | Admin dashboard |
| `security` | Auth, compliance, audit |
| `fix` | Bug fixes |
| `feat` | New features |

---

*Maintained by Nexus. Updated on every deployment.*
