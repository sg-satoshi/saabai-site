# Lex AI — Data Processing & Privacy Terms
## For Tributum Law (and template for future firm clients)

**Version 1.0 — May 2026**

---

## 1. What Lex Is

Lex is an AI-powered legal research and drafting assistant operated by Saabai Pty Ltd ("we", "us", "Saabai"). It uses large language models (LLMs) provided by Anthropic PBC ("Anthropic") via API to generate legal research, draft documents, and answer questions about Australian law.

Lex is a **research accelerator**, not a replacement for legal judgment. All outputs must be verified by a qualified legal practitioner before reliance.

---

## 2. How Your Data Flows

### 2.1 Normal Mode (Privacy Mode OFF)

When you submit a query to Lex without Privacy Mode enabled:

- Your query text is sent to our server (hosted on Vercel, US-based cloud infrastructure).
- Our server forwards your query to Anthropic's Claude API (US-based servers).
- Anthropic processes the query and returns a generated response.
- The response is streamed back to your browser.

**In this mode, the full text of your query — including any client names, matter details, or identifying information you include — is transmitted to Anthropic's servers in the United States.**

### 2.2 Privacy Mode (Privacy Mode ON) — Recommended

When Privacy Mode is enabled (toggle in the Lex interface):

- Before your query leaves our server, an automated scanner detects and replaces client-identifying information with anonymized tokens (e.g., `{{PERSON_1}}`, `{{TRUST_1}}`, `{{EMAIL_1}}`).
- The **tokenized** query is sent to Anthropic. Your original identifying data never reaches Anthropic.
- Anthropic's response is returned to our server, where the tokens are swapped back to your original data.
- The fully rehydrated response is sent to your browser.

**What gets tokenized:**
- Email addresses
- Phone numbers
- ABNs, ACNs, TFNs
- Trust and company names
- Person names with titles (Mr, Dr, etc.)
- Party references ("client", "applicant", "respondent" + name)

**What does NOT get tokenized:**
- Legal case names (e.g., *Donoghue v Stevenson*)
- Legislation citations
- General legal doctrine and terminology

**Important:** Privacy Mode is a best-effort automated system. It may miss some identifiers, particularly uncommon proper nouns or names without clear contextual signals. You remain responsible for reviewing your queries before submission.

---

## 3. Where Data Is Stored

| Data | Location | Retention | Encrypted |
|------|----------|-----------|-----------|
| Conversation history (messages) | Upstash Redis (cloud) | Until manually deleted or TTL expires | TLS in transit |
| Token maps (Privacy Mode) | Server memory only (per-request) | Destroyed immediately after response | N/A — never persisted |
| Vercel function logs | Vercel infrastructure | 30 days (Hobby) / 90 days (Pro) | TLS in transit |
| Anthropic API logs | Anthropic (US) | Up to 30 days for abuse monitoring | TLS in transit |

**Anthropic's data use:** Anthropic does not use API data to train its models unless a customer explicitly opts in. See Anthropic's API Data Policy: https://www.anthropic.com/legal/api-data-usage-policy

---

## 4. Your Obligations as a Law Firm

By using Lex, you agree to:

1. **Not input privileged or confidential client information** unless you have assessed the risk and obtained appropriate consent, or Privacy Mode is enabled.
2. **Review all AI-generated outputs** before they are provided to clients, filed, or relied upon in any legal proceeding.
3. **Verify all citations** — Lex may hallucinate case names, section numbers, or URLs. Always confirm against primary sources.
4. **Maintain your own backup** of any important documents drafted in Lex. We do not guarantee indefinite retention of conversation history.
5. **Comply with your professional obligations** under the Legal Profession Uniform Law, Australian Solicitors' Conduct Rules, and applicable Law Society guidance on AI use.

---

## 5. Australian Law Compliance

### 5.1 Legal Profession Uniform Law (Confidentiality)

You are responsible for ensuring your use of Lex complies with Rule 9 (Confidentiality) of the Legal Profession Uniform Law and equivalent state/territory rules. This includes understanding where client data goes and obtaining client consent where required.

### 5.2 Privacy Act 1988

If you input personal information (as defined in the Privacy Act) into Lex, you are responsible for ensuring your handling of that information complies with the Australian Privacy Principles, including APP 11 (security).

### 5.3 Client Legal Privilege

Be cautious about inputting privileged communications or advice into any cloud-based AI tool. If privilege is a concern in a matter, consult your senior partner or use offline drafting methods.

---

## 6. Data Breach Protocol

In the unlikely event of a data breach affecting your firm's Lex data:

1. We will notify you within 72 hours of becoming aware of the breach.
2. We will provide details of the data involved, the likely consequences, and the measures taken.
3. You are responsible for assessing whether the breach triggers your own obligations under the Notifiable Data Breaches scheme and notifying the OAIC and affected clients where required.

---

## 7. Limitation of Liability

To the maximum extent permitted by law:

- Saabai is not liable for any loss arising from reliance on Lex outputs.
- Saabai is not liable for any breach of client confidentiality arising from your input of identifying information with Privacy Mode disabled.
- Lex outputs are provided "as is" without warranties of accuracy, completeness, or fitness for any particular legal purpose.

Our total aggregate liability for any claim relating to Lex is capped at the amount you have paid us for Lex services in the 12 months preceding the claim.

---

## 8. Changes to These Terms

We may update these terms as Lex evolves. Material changes will be notified by email to your firm's registered contact at least 14 days before taking effect. Continued use of Lex after changes take effect constitutes acceptance.

---

## 9. Contact

For privacy questions, data deletion requests, or breach reports:

**Privacy Officer — Saabai Pty Ltd**
Email: privacy@saabai.ai

---

## 10. Agreement

By enabling or using Lex, the authorised representative of **[Firm Name]** agrees to these terms on behalf of the firm.

**Firm:** _________________________

**Authorised Representative:** _________________________

**Date:** _________________________

**Privacy Mode default setting:** ☐ ON  ☐ OFF

---

*These terms are a starting point for discussion. Tributum Law should have these reviewed by their own legal adviser or professional indemnity insurer before final adoption.*
