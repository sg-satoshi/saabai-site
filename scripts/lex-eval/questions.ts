/**
 * 20 Australian tax and ATO dispute questions for comparing Lex research models.
 * `expect` items are the key authorities or rules a good answer should state (each is
 * a case-insensitive regex). `wrong` items are known errors that cost points.
 * This is an automated screen, not a substitute for a lawyer marking the answers.
 */
export type EvalQuestion = { id: string; q: string; expect: { label: string; re: string }[]; wrong?: { label: string; re: string }[] };

const AAT_CURRENT = { label: "treats the AAT as the current tribunal", re: "(apply|application|lodge|seek review)[^.]{0,60}\\b(to|with|in) the (AAT|Administrative Appeals Tribunal)\\b" };

export const EVAL_QUESTIONS: EvalQuestion[] = [
  { id: "q01", q: "What is the time limit for an individual with a short period of review to object to an income tax assessment, and where is it set out?",
    expect: [{ label: "s 14ZW TAA 1953", re: "14ZW" }, { label: "two years", re: "(2|two)[ -]years?" }, { label: "Part IVC", re: "Part IVC" }] },
  { id: "q02", q: "My client missed the objection deadline. Can they still object, and what happens if the Commissioner refuses?",
    expect: [{ label: "s 14ZX extension request", re: "14ZX" }, { label: "review by the ART", re: "\\bART\\b|Administrative Review Tribunal" }], wrong: [AAT_CURRENT] },
  { id: "q03", q: "When will a loan from a private company to a shareholder be treated as a deemed dividend under Division 7A, and how can that be avoided?",
    expect: [{ label: "s 109D", re: "109D" }, { label: "complying loan agreement s 109N", re: "109N" }, { label: "minimum yearly repayment s 109E", re: "109E|minimum yearly repayment" }] },
  { id: "q04", q: "What is the ATO's current view on unpaid present entitlements owed by a trust to a corporate beneficiary under Division 7A?",
    expect: [{ label: "TD 2022/11", re: "TD 2022/11" }, { label: "financial accommodation", re: "financial accommodation" }] },
  { id: "q05", q: "Who bears the burden of proof in a review of an objection decision, and what must be shown?",
    expect: [{ label: "s 14ZZK (tribunal) or 14ZZO (court)", re: "14ZZK|14ZZO" }, { label: "assessment excessive", re: "excessive" }] },
  { id: "q06", q: "What base penalty applies to a tax shortfall caused by failure to take reasonable care, and how does it scale for recklessness and intentional disregard?",
    expect: [{ label: "s 284-90 Sch 1 TAA", re: "284-90" }, { label: "25%", re: "25 ?(%|per ?cent)" }, { label: "50%", re: "50 ?(%|per ?cent)" }, { label: "75%", re: "75 ?(%|per ?cent)" }] },
  { id: "q07", q: "Can the Commissioner remit a shortfall penalty, and can that decision be challenged?",
    expect: [{ label: "s 298-20 Sch 1 TAA", re: "298-20" }, { label: "objection to remission decision", re: "object" }] },
  { id: "q08", q: "What penalty applies for failing to lodge an income tax return on time?",
    expect: [{ label: "s 286-75 Sch 1 TAA", re: "286-75" }, { label: "penalty units", re: "penalty units?" }, { label: "28 day periods", re: "28[ -]days?" }] },
  { id: "q09", q: "How long does the Commissioner have to amend an individual's assessment, and are there exceptions?",
    expect: [{ label: "s 170 ITAA 1936", re: "\\b170\\b" }, { label: "fraud or evasion unlimited", re: "fraud or evasion" }] },
  { id: "q10", q: "Explain how the dominant purpose test works under Part IVA.",
    expect: [{ label: "s 177D", re: "177D" }, { label: "eight factors", re: "eight|8 (matters|factors)" }, { label: "Hart [2004] HCA 26", re: "Hart" }] },
  { id: "q11", q: "What is the ATO's position on section 100A reimbursement agreements, and what guidance has it issued?",
    expect: [{ label: "TR 2022/4", re: "TR 2022/4" }, { label: "PCG 2022/2", re: "PCG 2022/2" }, { label: "ordinary family or commercial dealing", re: "ordinary family or commercial dealing" }] },
  { id: "q12", q: "When is income personal services income, and when do the PSI rules not apply?",
    expect: [{ label: "results test s 87-18", re: "87-18|results test" }, { label: "80% rule s 87-15", re: "87-15|80 ?(%|per ?cent)" }, { label: "personal services business", re: "personal services business" }] },
  { id: "q13", q: "Can a taxpayer keep the main residence exemption after moving out and renting the home?",
    expect: [{ label: "s 118-145", re: "118-145" }, { label: "six years", re: "(6|six)[ -]years?" }] },
  { id: "q14", q: "What are the basic conditions for the small business CGT concessions?",
    expect: [{ label: "s 152-10", re: "152-10" }, { label: "$6 million net asset value", re: "\\$6 ?(m|million)" }, { label: "$2 million turnover", re: "\\$2 ?(m|million)" }] },
  { id: "q15", q: "Are legal expenses incurred defending a business against a damages claim deductible?",
    expect: [{ label: "s 8-1 ITAA 1997", re: "8-1" }, { label: "Herald & Weekly Times", re: "Herald" }, { label: "capital vs revenue", re: "capital" }] },
  { id: "q16", q: "Is the Commissioner bound by a public ruling, and what protection does a taxpayer get by following one?",
    expect: [{ label: "s 357-60 Sch 1 TAA", re: "357-60" }, { label: "binding on the Commissioner", re: "bind" }] },
  { id: "q17", q: "What power does the ATO have to issue a garnishee notice to a taxpayer's bank?",
    expect: [{ label: "s 260-5 Sch 1 TAA", re: "260-5" }] },
  { id: "q18", q: "How do director penalty notices work, and when is a director's liability locked down?",
    expect: [{ label: "Div 269 Sch 1 TAA", re: "269" }, { label: "three months", re: "(3|three) months" }, { label: "21 days", re: "21 days" }] },
  { id: "q19", q: "What options exist to settle a tax dispute with the ATO before litigation?",
    expect: [{ label: "settlement (Code of settlement)", re: "settlement" }, { label: "independent review", re: "independent review" }] },
  { id: "q20", q: "My client's objection was disallowed last week. How and by when can they seek merits review?",
    expect: [{ label: "ART", re: "\\bART\\b|Administrative Review Tribunal" }, { label: "60 days", re: "60 days" }], wrong: [AAT_CURRENT] },
];
