# SOC 2 Type II Action Plan
## Saabai Pty Ltd — AI Legal Assistant (Lex)

**Prepared:** May 2026  
**Company:** Saabai Pty Ltd (1-person SaaS)  
**Client:** Tributum Law (1 enterprise client)  
**Product:** Lex — AI legal assistant  
**Objective:** Understand SOC 2 Type II and plan a credible path to certification

---

## 1. Executive Summary

- SOC 2 Type II is the **gold-standard security credential** for SaaS companies selling to enterprise legal and financial services
- It is not a legal requirement — it is a **market-access and trust tool**
- For a 1-person company with 1 client: **Prep first, certify second.** Do not rush to audit before controls are hardened and evidenced

---

## 2. Recommended SOC 2 Auditors (Australian SaaS Experience)

### Tier 1: Specialist / Startup-Friendly

- **AssuranceLab** (Australia / NZ focused)
  - Known for automated evidence collection, startup-friendly pricing
  - Strong with Australian SaaS and fintech
  - Offers readiness assessments before full audit

### Tier 2: Global Leaders with Australian Presence

- **Schellman & Company**
  - One of the most recognised SOC 2 auditors globally
  - Australian office, works with high-growth SaaS
  - Premium pricing but fastest brand recognition with US/UK enterprise buyers

- **BDO Australia**
  - Big-4-level credibility, local Australian presence
  - Strong in legal-tech and regulated-sector audits
  - Good for board-level reporting and Australian regulatory alignment

### Tier 3: Additional Options

- **Coalfire** — popular with US SaaS, expanding Australia footprint
- **EY (Ernst & Young Australia)** — highest credibility, highest cost; overkill at 1 client

---

## 3. Cost Ranges (AUD, Estimated)

| Audit Type | Cost Range (AUD) | What It Covers |
|------------|------------------|----------------|
| **SOC 2 Type I** | $15,000 – $35,000 | Point-in-time assessment of controls design (month 3–4) |
| **SOC 2 Type II** | $35,000 – $75,000 | 3–12 month observation period + testing of control effectiveness |
| **Readiness / Gap Assessment** | $5,000 – $12,000 | Pre-audit review; identify missing policies/controls |
| **Ongoing Annual Type II** | $25,000 – $50,000 | Subsequent years (less setup, more maintenance) |

**Notes:**
- AssuranceLab typically sits at the lower end of these ranges
- Schellman and BDO sit at the upper end
- Costs exclude internal time, tooling (Vanta/Drata), and remediation work

---

## 4. Timeline: Start to Certificate

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| **Phase 1: Readiness** | 1–2 months | Gap assessment, policy writing, control mapping, tool selection |
| **Phase 2: Implementation** | 2–4 months | Deploy technical controls, enable logging, train processes, collect initial evidence |
| **Phase 3: Observation Period (Type II only)** | 3–6 months | Live operation with controls running; evidence auto-collected daily |
| **Phase 4: Audit & Reporting** | 4–6 weeks | Auditor fieldwork, control testing, draft report, final certificate |

**Total Time to Type II Certificate:** **6–12 months** from zero  
**Total Time to Type I Certificate:** **3–4 months** from zero

---

## 5. Preparation Checklist

### Policies (Must Be Documented & Approved)

- [ ] Information Security Policy
- [ ] Acceptable Use Policy
- [ ] Access Control Policy (least privilege, role-based)
- [ ] Data Classification & Handling Policy
- [ ] Incident Response Plan (including breach notification timelines)
- [ ] Business Continuity / Disaster Recovery Plan
- [ ] Vendor Management Policy (subprocessors, due diligence)
- [ ] Risk Assessment Procedure (annual, documented)
- [ ] Change Management Policy
- [ ] HR / Onboarding & Offboarding Policy (even for 1 person — define the process)

### Technical Controls (Must Be Implemented & Monitored)

- [ ] **Identity & Access Management (IAM)**
  - SSO enforced (Google Workspace, Okta, or JumpCloud)
  - MFA on all production and admin accounts
  - Unique user accounts (no shared logins)
  - Quarterly access reviews (documented)
- [ ] **Infrastructure Security**
  - Cloud environments in AWS / GCP / Azure with hardened configurations
  - Network segmentation, WAF, DDoS protection
  - Encryption at rest (AES-256) and in transit (TLS 1.2+)
  - Automated vulnerability scanning
- [ ] **Logging & Monitoring**
  - Centralised logging (e.g., Datadog, Splunk, or AWS CloudTrail)
  - Log integrity protection (tamper-proof)
  - Alerting on anomalous access or failures
- [ ] **Application Security**
  - Secure SDLC (code review, dependency scanning)
  - Penetration testing (annual, by external firm)
  - Secrets management (no hard-coded keys)
- [ ] **Data Protection**
  - Backups encrypted, tested, with defined RTO/RPO
  - Data retention and deletion procedures
  - Privacy policy aligned with Australian Privacy Principles (APPs)

### Evidence Collection (Continuous, for Type II)

- [ ] Automated screenshots/logs of control operation (e.g., MFA enforcement)
- [ ] Policy version history with approval dates
- [ ] Access review records (who reviewed, when, findings)
- [ ] Incident tickets (even false positives — shows process exists)
- [ ] Change request records
- [ ] Vendor risk assessments
- [ ] Employee training completion records
- [ ] Penetration test reports
- [ ] Backup restoration test results

### Recommended Compliance Tooling

- **Vanta** or **Drata** (~$10,000–20,000/yr AUD) — auto-evidence collection, policy templates, control monitoring
- Alternatively, manual tracking in Notion/Airtable + calendar reminders (cheaper, high admin overhead)

---

## 6. Direct Recommendation: Certify Now or Prep First?

**Recommendation: Prep first. Target Type I in 3–4 months, Type II in 9–12 months.**

### Why Not Immediate Type II?

- **High failure risk:** A 1-person company without hardened controls will likely receive a qualified or adverse opinion, wasting $35k+
- **Evidence gap:** Type II requires 3–6 months of historical evidence. If controls weren’t running consistently, the observation period resets
- **Opportunity cost:** Money and time better spent on product, second client, and control hardening

### Smart Sequencing

1. **Now (Month 0–1):** Run a readiness gap assessment ($5k–$10k) with AssuranceLab or via self-assessment
2. **Month 1–3:** Write policies, implement technical controls, start evidence collection
3. **Month 3–4:** Pursue SOC 2 Type I (design only) — this is a credible checkpoint and can be shared with prospects
4. **Month 4–9:** Run controls in production, collect evidence via Vanta/Drata or manual processes
5. **Month 9–12:** Engage auditor (Schellman, BDO, or AssuranceLab) for Type II

### What to Tell Tributum Law & Prospects in the Meantime

- “We are SOC 2 Type II **in progress** — Type I scheduled for Q3, Type II for Q1 next year”
- “We operate under a documented security program aligned with SOC 2 Trust Services Criteria and the Australian Privacy Principles”
- Share your Information Security Policy and penetration test report (if available) under NDA
- Offer to complete their security questionnaire transparently

---

## 7. Competitive Context: Harvey vs. Saabai

### What Harvey Has (SOC 2 Type II)

- **Market signal:** Harvey has raised $100M+; SOC 2 Type II is table stakes at their scale
- **Sales enablement:** Their sales team can bypass procurement security reviews with a single report
- **Enterprise readiness:** Controls are proven over 6–12 months; buyers trust operational maturity

### What Saabai Does NOT Have (Yet)

- No independent third-party attestation of security controls
- No documented historical evidence of continuous control operation
- No formal policies formally approved by a board/leadership (common at 1-person scale)

### How to Frame Saabai’s Current Position Credibly

**Do not bluff. Be precise and proactive:**

- **Stage-appropriate honesty:** “As an early-stage company, we are implementing a SOC 2-aligned security program now, with Type I audit planned for [date].”
- **Offset with transparency:** Offer to share your security questionnaire responses, policies, and encryption architecture
- **Leverage Australian jurisdiction:** Australian Privacy Act compliance and APP adherence are strong local signals
- **Client-specific focus:** Emphasise that with only 1–2 clients, you can offer bespoke security attention that scaled competitors cannot
- **Highlight AI-specific controls:** Document how you handle model inputs/outputs, prevent training data leakage, and manage prompt injection — this differentiates you from generic SaaS SOC 2 holders

---

## 8. Immediate Action Items (Next 30 Days)

- [ ] Engage AssuranceLab or BDO for a **SOC 2 readiness gap assessment** ($5k–$10k AUD)
- [ ] Sign up for **Vanta** or **Drata** trial; map your current infrastructure
- [ ] Draft the **5 core policies** (InfoSec, Access Control, Incident Response, Vendor Mgmt, BC/DR)
- [ ] Enable **MFA on all accounts** and create unique admin accounts (no shared logins)
- [ ] Enable **centralised logging** for your cloud environment (AWS CloudTrail / GCP Audit Logs)
- [ ] Schedule a **penetration test** (budget $5k–$10k AUD) — deliverable is useful even before SOC 2
- [ ] Document your **subprocessors** (OpenAI, cloud provider, etc.) and review their SOC 2 / ISO 27001 reports
- [ ] Add a **Security page** to saabai.ai highlighting current posture and roadmap

---

## 9. Summary Table

| Factor | Recommendation |
|--------|----------------|
| **Audit now?** | No — prep first |
| **First audit type** | SOC 2 Type I (design) |
| **Target Type II** | 9–12 months from now |
| **Preferred auditors** | AssuranceLab (cost), Schellman (brand), BDO Australia (local credibility) |
| **Budget (Year 1)** | $25,000 – $50,000 AUD (tools + Type I gap + Type II audit) |
| **Competitive positioning** | Be transparent; frame as “in progress” with APP compliance and AI-specific controls |

---

*This plan is a living document. Update quarterly as controls mature and audit dates approach.*
