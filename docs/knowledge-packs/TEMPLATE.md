# Client knowledge pack: template

Step 1 of the knowledge pack workstream (issue #314). One pack per client. It is the single source for the client's chatbot answers, website copy and AI search details, and it is kept up to date under the care plan.

This file is a template only. Nothing reads it yet, and it is not wired into any bot, page or llms.txt.

## Rules

- Every fact needs a source: a live page URL, a client email, or a signed document. No source, no fact.
- No made-up figures, results, reviews or quotes. Leave a field as "no data" until the client confirms it.
- Prices only as the client publishes them. Note whether they include GST.
- No em dashes in client copy.
- The client approves their own pack before anything from it goes live. Shane approves anything client-facing.
- Never store private details such as home addresses, personal phone numbers or payment details.

## Pack

Copy everything below into `docs/knowledge-packs/<client-slug>.md` and fill it in.

```md
# Knowledge pack: <Business name>

Status: draft | client approved (date) | live
Last checked: <date, Brisbane time>
Owner: <Saabai teammate>
Client contact for approvals: <role only, for example "Owner">

## 1. Business basics
- Trading name:
- Website:
- What the business does, in one sentence:
- Who it serves:
- Service areas (suburbs, cities or "Australia-wide"):
- Opening hours:
- Public contact methods (business phone, email, booking link):
Source:

## 2. Services
| Service | Plain description | Who it is for | Price as published | Source |
|---|---|---|---|---|
|  |  |  |  |  |

## 3. Pricing and policies
- Pricing notes (GST, call-out fees, minimums):
- Payment options:
- Refunds, cancellations and guarantees (quote the client's own wording):
Source:

## 4. Frequently asked questions
| Question | Approved answer | Source |
|---|---|---|
|  |  |  |

## 5. Reviews and proof
Only real, public reviews or results the client has confirmed in writing.
| Quote or result | Who (first name or business, with permission) | Where it is published | Date |
|---|---|---|---|
|  |  |  |  |

## 6. Things the chatbot must not say
- Topics to hand to a human:
- Claims to avoid:

## 7. Hand-off to a person
- When the chatbot should pass a chat to the team:
- Where leads go (inbox or CRM), only if in scope:

## 8. Gaps and questions for the client
- 

## Change log
| Date | Change | Approved by |
|---|---|---|
|  |  |  |
```

## Next steps (from #314)

1. Fill in the pilot pack for saabai.ai from the live site and the facts sheet, with QA Gate checking every source.
2. Wire it into the saabai.ai chatbot, site pages and llms.txt, and compare AI search answers before and after.
3. Sales & Marketing proposes how it sits in the care plan tiers. Any pricing change needs Shane's yes.
4. Roll out to existing care plan clients, each approving their own pack.
