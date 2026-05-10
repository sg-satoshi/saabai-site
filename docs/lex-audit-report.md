# LEX Legal AI — Comprehensive Audit Report
**Date:** 10 May 2026
**Auditor:** Nexus (LexEnhancer Agent)
**Codebase:** `sg-satoshi/saabai-site`
**Total Lines:** 8,608 across 22 files

---

## 1. Feature Inventory

### 1.1 Core Application (`app/lex/page.tsx` — 2,093 lines)
Lex is a sophisticated legal AI workspace with three primary modes:

#### 🔍 Research Mode
- **AI-powered legal research** with streaming responses
- **Thread-based conversations** — persistent chat history
- **Project organization** — group threads by matter/client
- **Quick reply suggestions** — 12 rotating prompts per session
- **File upload** — attach documents for context
- **Citation tracking** — sources referenced in research
- **Jurisdiction awareness** — state/federal/international

#### ✍️ Draft Mode
- **Document generation** from templates
- **Document type selection** — pre-configured legal document types
- **Party configuration** — define parties to the document
- **Jurisdiction targeting** — jurisdiction-specific drafting
- **Instructions field** — custom drafting instructions
- **Response length control** — brief/detailed/comprehensive
- **QA Verification pass** — post-generation quality check with:
  - Overall confidence score (0-100)
  - Per-section verification (verified/flagged/unverified)
  - Critical issues identification
  - Recommended checks

#### 📋 Review Mode
- **Document upload** (drag & drop + file picker)
- **Text paste** — paste document text directly
- **Document type classification** — auto-detect or manual select
- **Direction setting** — incoming vs outgoing document
- **Acting-for identification** — which party the firm represents
- **Comprehensive analysis** with:
  - Overall risk score (0-100)
  - Risk level classification (low/medium/high/critical)
  - Multi-axis findings: risk, missing clauses, legislation conflicts, market, accuracy, completeness, compliance, tone
  - Severity ratings: critical/moderate/minor
  - Redline recommendations
  - Missing clause detection
  - Legislation conflict identification
  - Recommended actions
- **Review queue** — submit reviews for processing
- **Review status tracking**

### 1.2 Widget (`app/lex-widget/`, `app/components/LexWidget.tsx`, `app/components/LexAvatarWidget.tsx`)
- **Embeddable chat widget** for law firm websites
- **Avatar widget** — floating launcher with chat window
- **Branded UI** with gold/navy colour scheme
- **Voice mode support** (via HeyGen token API)
- **Mobile-responsive**

### 1.3 API Routes

| Route | Lines | Capabilities |
|-------|-------|-------------|
| `lex-chat` | 110 | Streaming AI chat with Redis persistence |
| `lex-research` | 344 | Streaming research with tool calling (11 legal tools), citations, web search |
| `lex-draft` | 521 | Document generation with QA verification, streaming |
| `lex-review` | 165 | Document analysis with severity scoring, multi-axis findings |
| `lex-extract` | 51 | PDF/text extraction from uploaded documents |
| `lex-leads` | 51 | Lead capture with email notification |
| `lex-threads` | 68 | Thread CRUD with Redis persistence |
| `lex-settings` | 108 | Per-client configuration retrieval |
| `lex-review-queue` | 99 | Review job queue management |
| `lex-review-submit` | 150 | Review submission with email notification |

### 1.4 Research Tools (`lib/lex-tools.ts` — 11 tools)
1. **searchAustLII** — Australian legal information institute
2. **searchATO** — Australian Taxation Office resources
3. **searchLegislation** — Federal legislation
4. **searchInternational** — International law
5. **verifySection** — Verify legislative sections
6. **searchStateLegislation** — State-level legislation
7. **searchASIC** — ASIC/corporate law
8. **searchAAT** — Administrative Appeals Tribunal
9. **searchFairWork** — Fair Work legislation
10. **searchCorporationsLaw** — Corporations Act
11. **searchFamilyLaw** — Family law

### 1.5 Knowledge Base (`lib/lex-knowledge.ts` — 1,244 lines)
Comprehensive legal knowledge covering:
- Australian legal system overview
- Court hierarchies and jurisdictions
- Legal procedure basics
- Common legal terms and definitions
- Practice area guidance
- Document drafting principles

### 1.6 Document Types (`lib/lex-document-types.ts` — 498 lines)
Pre-configured document type definitions with:
- Category classification
- Required elements
- Jurisdiction specifics
- Purpose descriptions

### 1.7 Admin Dashboard (`app/saabai-admin/lex-*`)
- **Client management** — view/manage law firm clients
- **Status tracking** — monitor client onboarding status
- **Settings panel** — configure document types, API keys, branding
- **BYO API key** — clients use their own AI provider keys

### 1.8 Multi-Tenancy (`lib/lex-config.ts`)
- **Per-client configuration** — each firm has isolated settings
- **API key management** — client-provided keys
- **Feature toggles** — enable/disable capabilities per client

---

## 2. Gap Analysis

### 🔴 CRITICAL GAPS (Block commercial viability)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| C1 | **No structured client intake** | Law firms need to capture matter details, client info, urgency, conflicts check before AI engages. Currently no intake flow. | M |
| C2 | **No document comparison** | Can't compare two versions of a document (e.g., incoming draft vs firm template). Critical for contract review. | M |
| C3 | **No Word/PDF export** | Drafts can't be exported to editable formats. Only copy-to-clipboard exists. Lawyers need .docx output. | M |
| C4 | **No audit trail** | No logging of who accessed what, when, what AI generated. Required for professional indemnity and compliance. | L |
| C5 | **No calendar integration** | Can't schedule follow-ups, deadlines, court dates from within Lex. | M |

### 🟠 IMPORTANT GAPS (Competitive disadvantage)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| I1 | **Limited white-label** | No custom domain, limited branding options. Firms want their own URL and full brand control. | M |
| I2 | **No billing/subscription tracking** | No in-app billing management. Need to track usage, invoices, renewals. | M |
| I3 | **No client portal** | Clients can't log in to see their matters, documents, or communicate. Only lawyer-facing UI exists. | L |
| I4 | **No document versioning** | Can't track versions of drafts or see revision history. | S |
| I5 | **No template library management** | Firms can't upload/edit their own templates. Locked to built-in document types. | M |
| I6 | **No integration with practice management** | No Clio, Smokeball, LEAP, or ActionStep integration. Data siloed. | L |
| I7 | **Limited review workflow** | Reviews are submitted but no collaborative workflow (assign to lawyer, track status, escalate). | M |
| I8 | **No email integration** | Can't send drafts/reviews directly to clients from Lex. Only lead capture emails. | S |

### 🟡 NICE-TO-HAVE GAPS

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| N1 | **No AI voice calls** | Widget has voice mode placeholder but no true AI phone agent for client intake. | L |
| N2 | **No precedent library** | Can't save and reuse successful documents as precedents. | M |
| N3 | **No time tracking** | No automatic time recording for billable work. | S |
| N4 | **No conflict checking** | No automated conflict of interest checking against client database. | M |
| N5 | **Limited analytics** | No usage analytics, time saved metrics, or ROI reporting for firm admins. | S |

---

## 3. Prioritized Improvement Plan

### Phase 1: Foundation (Weeks 1–2) — Quick Wins
1. **Document export (.docx/.pdf)** — Enable lawyers to download drafts in usable formats
2. **Document comparison** — Upload two docs, see differences and AI analysis of changes
3. **Email from Lex** — Send drafts/reviews directly to clients with professional formatting
4. **Template library** — Allow firms to upload and manage their own document templates
5. **Basic audit trail** — Log all AI interactions, document accesses, and user actions

### Phase 2: Commercial Readiness (Weeks 3–4)
6. **Structured client intake** — Multi-step intake form: matter type, parties, urgency, documents, conflicts
7. **Review workflow** — Assign reviews to lawyers, track status, comments, approvals
8. **White-label domains** — Custom domain support for each firm
9. **Billing dashboard** — Usage tracking, invoice generation, subscription management
10. **Document versioning** — Track draft iterations with diff view

### Phase 3: Scale (Months 2–3)
11. **Client portal** — Client-facing login to view matters, upload docs, communicate
12. **Practice management integrations** — Clio, Smokeball, LEAP APIs
13. **Calendar integration** — Google/Outlook calendar for scheduling deadlines
14. **Conflict checking** — Automated conflicts database
15. **Analytics & ROI** — Time saved, usage reports, value metrics for firm admins

---

## 4. Quick Wins (Can Deploy This Week)

| # | Quick Win | Effort | Impact |
|---|-----------|--------|--------|
| Q1 | Add `.docx` export to draft mode | S | High — lawyers need editable output |
| Q2 | Add document comparison to review mode | S | High — common workflow |
| Q3 | Enable "Send to client" email from draft/review | S | High — closes delivery gap |
| Q4 | Add firm logo upload to settings | XS | Medium — branding improvement |
| Q5 | Expand quick-reply suggestions per practice area | XS | Medium — better UX |

---

## 5. Technical Observations

### Strengths
- **Solid architecture** — Next.js 16, TypeScript, AI SDK v6, proper tool calling
- **Comprehensive legal research tools** — 11 Australian legal databases
- **Good separation of concerns** — APIs, libs, widgets well organized
- **Multi-tenant ready** — per-client config with BYO API key
- **Admin dashboard exists** — foundation for client management

### Risks
- **No test coverage visible** — no test files found in Lex modules
- **Mixed auth patterns** — some routes check auth, some don't
- **No rate limiting** — could be expensive with BYO keys if abused
- **Client-side heavy** — 2,093 line page.tsx is complex; could benefit from component splitting

---

## 6. Recommendation

**Lex is 60–70% of a commercial legal AI product.** The core research, drafting, and review capabilities are impressive. The critical gaps are **intake, export, comparison, and audit trail** — without these, a law firm can't operationalize Lex into their workflow.

**Recommended immediate action:** Deploy Quick Wins Q1–Q3 this week while your friend provides feedback. This gives you a demonstrable upgrade for the strategic deal.

---
*Report generated by Nexus LexEnhancer Agent*
