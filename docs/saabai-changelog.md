# Saabai.ai Changelog

All notable changes to the Saabai.ai platform, products, and infrastructure.

Format: `YYYY-MM-DD — [Category] Description`

---

## 2026-05-10

### Lex (Legal AI)
- **feat:** DOCX export in draft mode — professional Word document with headers, footers, and styling
- **feat:** Send-to-Client email — branded email delivery from draft and review modes via Resend
- **feat:** Document comparison in review mode — compare two documents side-by-side, analyze differences
- **feat:** Client intake flow — "New Matter" button with matter type, urgency, and description
- **feat:** Contextual quick replies — property, family law, and commercial-specific suggestions
- **feat:** Email delivery API (`app/api/lex-send/route.ts`) — Resend-powered branded emails
- **feat:** Audit trail system (`lib/lex-audit.ts`) — fire-and-forget event logging for compliance

### Infrastructure
- **feat:** Async Agent Task Queue (`lib/agent-queue.ts`) — Redis-based job queue for true async sub-agents
- **feat:** Deployment Pipeline with QA Gates (`lib/deploy-pipeline.ts`, `app/api/deploy/route.ts`)
- **feat:** Deployment script (`scripts/deploy-site.sh`)
- **feat:** Firm logo upload + settings panel (`🏢 Firm Settings`) — custom firm name and logo in sidebar, branded DOCX exports

### Verified Live (E2E Testing)
- ✅ New Matter intake modal — matter type, urgency, description all functional
- ✅ Firm Settings modal — logo upload area + firm name field, saves to localStorage
- ✅ Send to Client email buttons — visible in both draft and review result panels
- ✅ Contextual quick replies — property/family/commercial pools active
- ✅ DOCX Export button — present in draft mode toolbar
- ✅ Document comparison UI — present in review mode (toggle may need hard refresh due to Vercel CDN caching)

### Chatbots
- **fix:** NextInvestment chatbot (Sophie) — markdown rendering, API fix, better errors
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
