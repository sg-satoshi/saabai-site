/**
 * Lex Document Type Registry
 *
 * Each entry defines what law governs a document type, what elements are
 * required, jurisdiction-specific notes, and drafting warnings.
 *
 * Used by the lex-draft API to build context-aware system prompts and
 * direct the drafter to search for the right governing legislation before
 * generating any draft.
 */

export interface DocumentType {
  id: string;
  name: string;
  category: "trust" | "family-law" | "commercial" | "employment" | "property";
  description: string;
  governingLegislation: { name: string; key_sections: string[] }[];
  requiredElements: string[];
  jurisdictionNotes: string;
  draftingWarnings: string[];
  searchTerms: string[];
}

// ── Trust Documents ───────────────────────────────────────────────────────────

const DISCRETIONARY_TRUST_DEED: DocumentType = {
  id: "discretionary-trust-deed",
  name: "Discretionary (Family) Trust Deed",
  category: "trust",
  description:
    "A trust deed establishing a discretionary trust in which the trustee has " +
    "absolute discretion to distribute income and capital among a defined class " +
    "of beneficiaries. Commonly used for asset protection and tax minimisation.",
  governingLegislation: [
    {
      name: "Income Tax Assessment Act 1997 (Cth)",
      key_sections: [
        "s 102AG (present entitlement of minor beneficiaries)",
        "s 97 (trustee assessable on trust net income)",
        "Subdivision 207-B (franking credit streaming)",
        "Division 6 (trust income — basic rules)",
        "Division 7A (corporate trustee loans)",
      ],
    },
    {
      name: "Corporations Act 2001 (Cth)",
      key_sections: [
        "s 9 (definition of officer, including corporate trustee)",
        "s 180–184 (director duties of corporate trustee)",
        "Chapter 5C (managed investment schemes — if applicable)",
      ],
    },
    {
      name: "Trusts Act 1973 (Qld) / Trustee Act 1958 (Vic) / Trustee Act 1925 (NSW)",
      key_sections: [
        "Trustee investment powers",
        "Trustee indemnity provisions",
        "Variation of trusts",
      ],
    },
  ],
  requiredElements: [
    "Valid trust creation — certainty of intention, certainty of subject matter, certainty of objects (the three certainties from Knight v Knight (1840) 3 Beav 148)",
    "Appointment of trustee (individual or corporate) with acceptance of trust",
    "Definition of the beneficiary class — primary beneficiaries and general beneficiaries",
    "Trust fund — initial settled sum (minimum $10 nominal) and accretions",
    "Distribution powers — income and capital distribution to discretionary beneficiaries",
    "Trustee powers clause — investment, borrowing, delegation, corporate powers",
    "Variation power — mechanism for trustee to vary trust terms (within limits)",
    "Vesting date — must be within perpetuity period (80 years under most State Acts, or life in being plus 21 years under common law rule against perpetuities)",
    "Appointor/Guardian role — power to remove and replace trustee",
    "Default beneficiaries — fallback distribution if no exercise of discretion",
    "Anti-avoidance provisions",
    "Execution clause — deed must be executed as a deed (not merely a contract)",
  ],
  jurisdictionNotes:
    "Stamp duty varies by state: Queensland — trust deeds are generally exempt from duty " +
    "(Duties Act 2001 (Qld) s 55); New South Wales — trust deeds over dutiable property " +
    "attract duty (Duties Act 1997 (NSW)); Victoria — discretionary trust deeds attract " +
    "nominal duty unless real property is settled (Duties Act 2000 (Vic)). " +
    "The trustee's state of residence typically determines which state Trustee Act applies.",
  draftingWarnings: [
    "Post-2011 streaming rules (Subdiv 207-B ITAA97): trust deed must explicitly authorise " +
    "streaming of franked distributions and capital gains to specific beneficiaries or streaming elections are unavailable.",
    "Trust tax reform risk: Treasury has proposed reforms to trust taxation. Deeds should include " +
    "a variation power broad enough to accommodate legislative changes.",
    "Penn v Downie [2005] VSC 64: a deed that fails to constitute a valid trust at law will be " +
    "ineffective regardless of tax treatment. Confirm all three certainties are met.",
    "Corporate trustee: if using a corporate trustee, the company must be incorporated before " +
    "the deed is signed. A company cannot be appointed trustee before it exists.",
    "Division 7A: loans from the trust to a private company trustee (or related entities) may " +
    "trigger deemed dividend issues.",
    "Section 100A ITAA36: arrangements where a beneficiary is made presently entitled but " +
    "another party receives the economic benefit may be recharacterised by the ATO.",
  ],
  searchTerms: [
    "discretionary trust deed Australia",
    "family trust deed ITAA97 s102AG",
    "trust streaming rules Subdivision 207-B",
    "Penn v Downie trust certainties",
    "discretionary trust stamp duty Queensland NSW Victoria",
    "ATO trust tax reform trustee",
    "Section 100A ITAA36 trust distribution",
  ],
};

const UNIT_TRUST_DEED: DocumentType = {
  id: "unit-trust-deed",
  name: "Unit Trust Deed",
  category: "trust",
  description:
    "A trust deed establishing a unit trust in which beneficial ownership is " +
    "divided into units held by unitholders. Distributions are made pro rata " +
    "to unit holdings rather than at trustee discretion.",
  governingLegislation: [
    {
      name: "Income Tax Assessment Act 1997 (Cth)",
      key_sections: [
        "Division 6 (trust income)",
        "s 97 (fixed trust — unitholder assessed on trust net income)",
        "s 102AC (present entitlement)",
        "CGT provisions — s 104-70 to s 104-75 (unit trust redemption events)",
      ],
    },
    {
      name: "Corporations Act 2001 (Cth)",
      key_sections: [
        "Chapter 5C (managed investment scheme — applies if more than 20 members or promoted to public)",
        "s 601ED (when a scheme must be registered)",
        "s 601FC–601FJ (responsible entity obligations if registered MIS)",
        "Part 7.9 (financial product disclosure — if units are financial products)",
      ],
    },
    {
      name: "Trusts Act 1973 (Qld) / Trustee Act (State)",
      key_sections: [
        "Trustee investment powers",
        "Trustee indemnity",
      ],
    },
  ],
  requiredElements: [
    "Unit classes — definition of unit classes and rights attaching to each class",
    "Subscription mechanism — how units are issued and at what price",
    "Redemption mechanism — how units may be redeemed and at what price",
    "Transfer restrictions — approval of transfers, pre-emptive rights",
    "Distribution provisions — timing and calculation of distributions (generally pro rata to units held)",
    "Trustee powers — investment, borrowing, delegation",
    "Unitholders meeting provisions — calling, quorum, voting rights",
    "Vesting date",
    "Accounts and audit requirements",
    "Amendment procedure — how the deed may be varied",
    "Winding up provisions",
    "Execution as a deed",
  ],
  jurisdictionNotes:
    "If the unit trust has more than 20 members, or if units are issued to the public, " +
    "the scheme must be registered as a managed investment scheme under Chapter 5C of the " +
    "Corporations Act 2001 (Cth). An unlicensed MIS is a serious criminal offence. " +
    "Stamp duty on issue and transfer of units varies by state.",
  draftingWarnings: [
    "Managed investment scheme threshold: more than 20 members triggers mandatory MIS " +
    "registration (Corporations Act 2001 (Cth) s 601ED). Verify member count before finalising.",
    "Fixed trust status: if the trust does not have fixed entitlements under s 272-5 ITAA36 " +
    "(Sch 2F), flow-through of tax losses may be denied.",
    "Financial product: units in a unit trust are likely a financial product requiring " +
    "an Australian Financial Services Licence (AFSL) to issue or deal in. Verify AFSL requirements.",
    "Stamp duty: transfer of units in a trust over dutiable property (particularly land) " +
    "may attract land-rich or landholder duty in some states.",
  ],
  searchTerms: [
    "unit trust deed Australia ITAA97",
    "unit trust managed investment scheme Corporations Act 601ED",
    "unit trust fixed trust loss provisions schedule 2F",
    "unit trust financial product AFSL",
    "unit trust stamp duty land rich",
  ],
};

// ── Family Law Documents ──────────────────────────────────────────────────────

const BFA_MARRIED: DocumentType = {
  id: "binding-financial-agreement-married",
  name: "Binding Financial Agreement (Married Couples)",
  category: "family-law",
  description:
    "A Binding Financial Agreement (BFA) under the Family Law Act 1975 (Cth) for married " +
    "couples. May be entered before marriage (s 90B), during marriage (s 90C), or after " +
    "divorce (s 90D). Deals with property and financial resources, and may include spousal " +
    "maintenance provisions.",
  governingLegislation: [
    {
      name: "Family Law Act 1975 (Cth)",
      key_sections: [
        "s 90B (BFA before marriage)",
        "s 90C (BFA during marriage)",
        "s 90D (BFA after divorce)",
        "s 90G (requirements for BFA to be binding — CRITICAL: independent legal advice)",
        "s 90H (effect of BFA — excludes court jurisdiction under Part VIII)",
        "s 90K (circumstances in which BFA may be set aside by court)",
        "s 90KA (effect of death of party)",
        "s 75(2) (factors relevant to spousal maintenance)",
        "Part VIII (property settlement — excluded by valid BFA)",
        "Part VIIIA (financial agreements generally)",
      ],
    },
    {
      name: "Federal Circuit and Family Court of Australia Act 2021 (Cth)",
      key_sections: [
        "Division 2 (jurisdiction of FCFCOA)",
      ],
    },
  ],
  requiredElements: [
    "Identification of parties — full legal names, addresses, date and place of marriage",
    "Recitals — relationship status, date of marriage, intention to make a financial agreement",
    "Property covered — real property, personal property, financial resources, superannuation interests",
    "Financial resources — bank accounts, shares, business interests, entitlements",
    "Debt allocation — mortgages, personal loans, credit card debts",
    "Spousal maintenance provisions — either agreed terms OR explicit waiver under s 90E",
    "CRITICAL — Certificate of Independent Legal Advice: each party must attach a signed " +
      "certificate from their own separately retained lawyer confirming: (a) advice was given " +
      "before signing; (b) the effect and advantages/disadvantages of the agreement were explained " +
      "(s 90G(1)(b))",
    "Execution — each party must sign in the presence of a witness",
    "Both lawyers' signed certificates must be attached before the agreement is binding",
    "Acknowledgment of voluntariness — agreement not entered under duress or undue influence",
  ],
  jurisdictionNotes:
    "The Family Law Act 1975 (Cth) applies throughout Australia including all states and " +
    "territories. The Federal Circuit and Family Court of Australia (Division 1 and 2) has " +
    "jurisdiction over married couples. De facto couples in all states except WA are covered " +
    "under separate provisions (ss 90MF–90MH).",
  draftingWarnings: [
    "CRITICAL — s 90G requirements: If either party did not receive independent legal advice " +
    "before signing, the BFA is NOT binding. This is the most common ground for setting aside. " +
    "Each party needs their OWN lawyer — the same lawyer cannot advise both parties.",
    "s 90K grounds for setting aside: fraud, non-disclosure of material matter, " +
    "agreement is void/voidable/unenforceable, impracticable to carry out, material change in " +
    "circumstances relating to a child, unconscionable conduct, a party's circumstances have " +
    "changed and it would cause hardship to maintain. Draft proactively to resist these grounds.",
    "Superannuation: if superannuation is to be dealt with, specific superannuation splitting " +
    "provisions under Part VIIIB are required — a general property clause does NOT capture super.",
    "Unconscionability: an agreement entered under emotional pressure, without proper time to " +
    "consider, or where disclosure was inadequate may be set aside as unconscionable.",
    "Competing documents: if the parties have existing consent orders, the BFA may conflict. " +
    "Address any pre-existing orders explicitly.",
    "Death: the agreement must address what happens on the death of a party (s 90KA) or it " +
    "may not bind the estate.",
  ],
  searchTerms: [
    "binding financial agreement Family Law Act 1975 s90G",
    "BFA section 90G independent legal advice certificate requirements",
    "BFA set aside section 90K grounds",
    "financial agreement married couples Australia",
    "spousal maintenance section 75(2) factors",
    "superannuation splitting Part VIIIB family law",
  ],
};

const BFA_DEFACTO: DocumentType = {
  id: "binding-financial-agreement-defacto",
  name: "Binding Financial Agreement (De Facto Couples)",
  category: "family-law",
  description:
    "A Binding Financial Agreement for de facto couples under the Family Law Act 1975 (Cth). " +
    "May be entered before (s 90MF), during (s 90MG), or after the end of a de facto " +
    "relationship (s 90MH). Same independent legal advice certificate requirements as for " +
    "married couples.",
  governingLegislation: [
    {
      name: "Family Law Act 1975 (Cth)",
      key_sections: [
        "s 4AA (definition of de facto relationship)",
        "s 90MF (BFA before de facto relationship)",
        "s 90MG (BFA during de facto relationship)",
        "s 90MH (BFA after end of de facto relationship)",
        "s 90MI (requirements for BFA to be binding — mirrors s 90G)",
        "s 90MJ (effect of BFA)",
        "s 90K (grounds for setting aside — applied via s 90MK)",
        "s 90SM (property settlement for de facto couples)",
        "s 90SF (spousal maintenance equivalent for de facto partners)",
        "Part VIIIAB (financial agreements for de facto couples)",
      ],
    },
  ],
  requiredElements: [
    "Identification of parties — full legal names, addresses, date relationship commenced",
    "Recitals — de facto relationship status, jurisdiction referral (state must have referred powers)",
    "Property covered — real property, personal property, financial resources",
    "Financial resources",
    "Debt allocation",
    "Maintenance provisions or explicit waiver",
    "CRITICAL — Certificate of Independent Legal Advice from each party's own lawyer: " +
      "same requirements as s 90G for married couples (applied via s 90MI)",
    "Execution — each party signs in the presence of a witness",
    "Both lawyers' certificates attached",
    "Acknowledgment of voluntariness",
  ],
  jurisdictionNotes:
    "The Commonwealth de facto financial agreements scheme applies in all states and " +
    "territories that have referred their legislative power to the Commonwealth: NSW, Vic, Qld, " +
    "SA, Tas, ACT, NT (all referred). Western Australia has its own regime under the " +
    "Family Court Act 1997 (WA) — use WA-specific provisions for WA de facto couples. " +
    "Minimum 2-year relationship or child/substantial contribution required to access " +
    "court jurisdiction (s 90SB) — BFA operates to contract out of this.",
  draftingWarnings: [
    "CRITICAL — s 90MI mirrors s 90G: independent legal advice is mandatory. " +
    "Agreement is not binding without it.",
    "Western Australia: de facto couples in WA are NOT covered by the Family Law Act " +
    "Commonwealth provisions. They are covered by the Family Court Act 1997 (WA). " +
    "Use different legislative references for WA parties.",
    "Definition of de facto: parties must meet the s 4AA definition — living together on " +
    "a genuine domestic basis. Address the commencement date carefully.",
    "Same-sex couples: explicitly covered by the Family Law Act since 2009 amendments.",
    "Same grounds for setting aside as married BFAs apply via s 90MK.",
  ],
  searchTerms: [
    "binding financial agreement de facto Family Law Act s90MG",
    "de facto relationship section 4AA definition",
    "de facto BFA independent legal advice s90MI",
    "Western Australia de facto Family Court Act 1997",
    "de facto property settlement s90SM",
  ],
};

const CONSENT_ORDERS: DocumentType = {
  id: "financial-settlement-consent-orders",
  name: "Consent Orders for Property Settlement",
  category: "family-law",
  description:
    "Consent Orders for property settlement and/or spousal maintenance under Part VIII " +
    "of the Family Law Act 1975 (Cth). Filed with the Federal Circuit and Family Court of " +
    "Australia. The Court must be satisfied the orders are just and equitable before " +
    "approving them.",
  governingLegislation: [
    {
      name: "Family Law Act 1975 (Cth)",
      key_sections: [
        "s 79 (alteration of property interests — primary settlement power)",
        "s 79A (setting aside property orders)",
        "s 75(2) (factors for spousal maintenance and property — the checklist)",
        "s 81 (duty of the court to make orders that finalise financial matters — cleanbreak principle)",
        "Part VIII (property and financial matters — married couples)",
        "Part VIIIB (superannuation splitting orders)",
        "s 90MN (de facto couples — equivalent to s 79)",
        "s 90SN (de facto couples — setting aside orders)",
      ],
    },
    {
      name: "Federal Circuit and Family Court of Australia Act 2021 (Cth)",
      key_sections: [
        "s 58 (jurisdiction)",
        "Part 5 (procedure)",
      ],
    },
    {
      name: "Family Law Rules 2021 (Cth)",
      key_sections: [
        "Rule 10.15 (consent orders — filing requirements)",
        "Schedule 3 (approved form for consent orders)",
      ],
    },
  ],
  requiredElements: [
    "Application for Consent Orders in the approved form (FCFCOA Form 11)",
    "Minutes of Consent Orders — the proposed orders in numbered paragraphs",
    "Schedule of Assets and Liabilities — complete disclosure of all assets, liabilities, " +
      "and financial resources of both parties",
    "Proposed division — clearly stated percentage or specific asset allocation",
    "Transfer provisions — mechanics of how property transfers will occur (including timeframes)",
    "Superannuation splitting orders if superannuation is to be divided " +
      "(Part VIIIB — requires flagging notice and procedural requirements)",
    "Spousal maintenance orders or dismissal of maintenance claims under s 75(2) factors",
    "Costs order (usually no order as to costs)",
    "Clean break provision — acknowledging orders finalise all property matters between parties",
    "Filing fee payment (currently ~$160 — verify current fee schedule)",
    "Both parties' signatures on the Application form",
  ],
  jurisdictionNotes:
    "Filed with the Federal Circuit and Family Court of Australia. There are no court fees " +
    "for consent orders in some circumstances — verify current fee schedule. The Court is NOT " +
    "a rubber stamp — it will scrutinise whether orders are just and equitable. " +
    "Orders do not take effect until sealed by the Court.",
  draftingWarnings: [
    "Just and equitable threshold: the Court must be satisfied the orders are just and equitable " +
    "having regard to s 75(2) factors. An order that appears overly one-sided may be rejected.",
    "Superannuation: if superannuation is to be split, the trustee of the super fund must be " +
    "served with a flagging notice and given opportunity to object before orders are made. " +
    "This takes time — allow for procedural requirements under Part VIIIB.",
    "Stamp duty: transfers of real property pursuant to consent orders are generally exempt from " +
    "stamp duty in most states — but verify each state's exemption provision.",
    "Capital gains tax: the ATO treats transfers under consent orders as rollover events — " +
    "CGT is deferred, not exempt. Advise parties on future CGT liability.",
    "Timing: consent orders only take effect when sealed by the Court. Transactions should not " +
    "proceed until orders are sealed.",
    "Full and frank disclosure: parties have a duty of full and frank disclosure. Failure to " +
    "disclose material assets is grounds for setting aside under s 79A.",
  ],
  searchTerms: [
    "consent orders property settlement Family Law Act s79",
    "FCFCOA consent orders just and equitable",
    "superannuation splitting consent orders Part VIIIB",
    "s75(2) factors spousal maintenance property",
    "consent orders stamp duty exemption property transfer",
    "capital gains tax rollover family law transfer",
  ],
};

const SEPARATION_AGREEMENT: DocumentType = {
  id: "separation-agreement",
  name: "Separation Agreement",
  category: "family-law",
  description:
    "An informal separation agreement (memorandum of understanding) between separating " +
    "parties. Typically covers interim parenting arrangements, property access, and bill " +
    "payments. This is NOT a legally binding property settlement — it is a precursor to " +
    "either a Binding Financial Agreement or Consent Orders.",
  governingLegislation: [
    {
      name: "Family Law Act 1975 (Cth)",
      key_sections: [
        "s 60I (parenting — mandatory family dispute resolution before court)",
        "s 61DA (presumption of equal shared parental responsibility)",
        "Part VII (parenting orders — applies to court proceedings, not this agreement)",
        "Part VIII (property — this agreement does NOT constitute property orders)",
      ],
    },
    {
      name: "Contract law (common law)",
      key_sections: [
        "Offer and acceptance",
        "Consideration",
        "Intention to create legal relations (note: limited for domestic arrangements)",
      ],
    },
  ],
  requiredElements: [
    "Identification of parties and children",
    "Date of separation",
    "Parenting arrangements — where children reside, time with each parent, communication",
    "Interim property arrangements — who occupies the family home, who pays what bills",
    "Joint bank accounts and credit cards — interim management",
    "Motor vehicles — who uses which vehicle",
    "Superannuation — note that this agreement does NOT deal with super (requires court orders)",
    "Acknowledgment that this agreement is NOT a final property settlement",
    "Statement of intention — that parties will proceed to formalise arrangements by BFA or Consent Orders",
    "Dispute resolution mechanism for interim disagreements",
  ],
  jurisdictionNotes:
    "A separation agreement is a document of practical utility only — it is NOT legally binding " +
    "on property division and will NOT prevent a party from making a property claim. " +
    "Parties have 12 months from divorce (or 2 years from end of de facto relationship) " +
    "to commence property proceedings. This agreement does not stop that clock. " +
    "For binding effect, parties must proceed to a BFA or Consent Orders.",
  draftingWarnings: [
    "NOT LEGALLY BINDING ON PROPERTY: This document is not a Binding Financial Agreement " +
    "and does not prevent either party from commencing property proceedings in court.",
    "Parenting arrangements in this document are informal only. They do not have the force of " +
    "Parenting Orders. Either party may vary them without court permission.",
    "Limitation period: property claims must be made within 12 months of divorce becoming final " +
    "(married) or 2 years of separation (de facto). Note the relevant deadline.",
    "Domestic violence: if there are safety concerns, this document should not be used as a " +
    "substitute for safety planning. Advise the client appropriately.",
    "Do not draft as though this document is a BFA — it does not meet s 90G requirements and " +
    "purporting to make it binding as a BFA without complying with s 90G is worse than a non-binding " +
    "separation agreement (it may be found invalid and create false security).",
  ],
  searchTerms: [
    "separation agreement Australia interim arrangements",
    "family law separation parenting arrangements interim",
    "separation agreement property not binding",
    "limitation period property claim family law divorce",
    "s60I family dispute resolution certificate",
  ],
};

// ── Commercial Documents ──────────────────────────────────────────────────────

const SERVICE_AGREEMENT: DocumentType = {
  id: "service-agreement",
  name: "Services Agreement / Consulting Agreement",
  category: "commercial",
  description:
    "A commercial agreement under which a service provider agrees to provide specified " +
    "services to a client in exchange for fees. Covers independent contractors and " +
    "consulting arrangements. Governed by contract law principles and the Australian " +
    "Consumer Law.",
  governingLegislation: [
    {
      name: "Competition and Consumer Act 2010 (Cth) Schedule 2 — Australian Consumer Law",
      key_sections: [
        "Part 2-2 (misleading or deceptive conduct)",
        "Part 2-3 (unfair contract terms — small business contracts)",
        "Part 3-2 Division 1 (consumer guarantees — if services are to a consumer)",
        "s 23 (unfair terms in standard form contracts — void if unfair)",
        "s 24 (meaning of unfair term)",
        "s 25 (examples of unfair terms — limitation of liability clauses at risk)",
      ],
    },
    {
      name: "Contract law (common law Australia)",
      key_sections: [
        "Offer and acceptance",
        "Consideration",
        "Certainty of terms",
        "Implied duty of good faith (Renard Constructions v Minister for Public Works (1992) 26 NSWLR 234 — note this is NSW only)",
        "Exclusion clauses (Photo Production Ltd v Securicor Transport Ltd [1980] AC 827 — principles adopted in Australia)",
      ],
    },
    {
      name: "Fair Work Act 2009 (Cth)",
      key_sections: [
        "s 12 (definition of employee — sham contracting provisions)",
        "Part 3-1 (sham contracting — misrepresenting employment as independent contract)",
      ],
    },
    {
      name: "Copyright Act 1968 (Cth)",
      key_sections: [
        "s 35 (ownership of copyright — default: author owns, not commissioner)",
        "s 197 (commissioned works — limited circumstances where commissioner owns)",
      ],
    },
  ],
  requiredElements: [
    "Parties — full legal names and ABNs",
    "Scope of services — precise description of what the contractor will provide",
    "Fees and payment terms — rate, invoicing frequency, payment period (note: late payment interest)",
    "Term — commencement date and duration or trigger event",
    "Intellectual property — assignment of IP created under the agreement to the client " +
      "(CRITICAL: without express assignment, the contractor retains copyright by default under s 35 Copyright Act 1968)",
    "Moral rights — waiver or consent under Copyright Act 1968 (Cth) Part IX",
    "Confidentiality — definition of confidential information, obligations, exceptions, survival",
    "Limitation of liability — cap on liability (note: may be unfair term under ACL if small business)",
    "Indemnities — mutual indemnities for breach, IP infringement",
    "Insurance — public liability, professional indemnity (specify minimum amounts)",
    "Termination — for convenience (notice period), for cause (breach + cure period)",
    "Dispute resolution — internal escalation, then mediation, then arbitration or litigation",
    "Governing law — Australian state jurisdiction",
    "GST clause — fees stated exclusive of GST; GST added as required",
    "Independent contractor status — acknowledgment that contractor is not an employee",
  ],
  jurisdictionNotes:
    "Australian Consumer Law applies nationally. Unfair contract terms provisions (ACL Part 2-3) " +
    "apply to standard form small business contracts where one party has less than 100 employees " +
    "or an annual turnover of less than $10 million (thresholds expanded from November 2023). " +
    "State law governs contract formation and enforcement.",
  draftingWarnings: [
    "Unfair contract terms: limitation of liability clauses, unilateral variation rights, and " +
    "broad indemnities in standard form contracts to small businesses are at risk of being void " +
    "under ACL s 23. Since 9 November 2023, penalties apply for including unfair terms.",
    "IP ownership: do NOT assume the client owns IP created under the agreement. " +
    "Without an express assignment clause, the contractor/author retains copyright (Copyright Act s 35). " +
    "Draft an explicit assignment.",
    "Sham contracting: if the agreement is with a person who is economically dependent on the " +
    "client, the Fair Work Act sham contracting provisions may apply. Consider whether this " +
    "is truly a contractor arrangement.",
    "GST: ensure fees are stated exclusive of GST and the agreement obliges the contractor " +
    "to issue tax invoices.",
    "Consumer guarantees: if the client is a consumer (not in trade or commerce for services " +
    "over $100,000), consumer guarantees under ACL Part 3-2 cannot be excluded.",
  ],
  searchTerms: [
    "services agreement consulting Australia ACL unfair contract terms",
    "independent contractor agreement Australia sham contracting",
    "copyright assignment services agreement Australia s35",
    "unfair contract terms small business ACL 2023 amendments",
    "service agreement limitation of liability ACL",
  ],
};

const EMPLOYMENT_CONTRACT: DocumentType = {
  id: "employment-contract",
  name: "Employment Contract",
  category: "employment",
  description:
    "A written employment contract for an employee engaged in Australia. Must comply with " +
    "the Fair Work Act 2009 (Cth), National Employment Standards (NES), and any applicable " +
    "Modern Award or Enterprise Agreement. Post-employment restraints are only enforceable " +
    "if reasonable.",
  governingLegislation: [
    {
      name: "Fair Work Act 2009 (Cth)",
      key_sections: [
        "s 61–131 (National Employment Standards — the 11 minimum standards)",
        "s 62 (maximum weekly hours)",
        "s 67 (parental leave and related entitlements)",
        "s 87 (annual leave — 4 weeks minimum)",
        "s 96 (personal/carer's leave — 10 days minimum)",
        "s 106 (community service leave)",
        "s 117 (notice of termination)",
        "s 119 (redundancy pay)",
        "s 340 (adverse action — protecting workplace rights)",
        "Part 3-1 (general protections)",
        "Part 3-2 (unfair dismissal)",
        "s 536 (obligation to provide Fair Work Information Statement)",
      ],
    },
    {
      name: "Modern Awards (Fair Work Commission)",
      key_sections: [
        "Applicable modern award determined by industry/occupation",
        "Minimum wage rates",
        "Penalty rates and overtime",
        "Classification levels",
        "Award flexibility arrangements",
      ],
    },
    {
      name: "Superannuation Guarantee (Administration) Act 1992 (Cth)",
      key_sections: [
        "s 19 (superannuation guarantee charge — currently 11.5% from 1 July 2024, rising to 12% from 1 July 2025)",
      ],
    },
  ],
  requiredElements: [
    "Parties — employer (entity name, ACN/ABN) and employee (full name, address)",
    "Position title and classification under applicable Modern Award",
    "Commencement date",
    "Location — principal place of work",
    "Employment type — full-time, part-time, or casual",
    "Hours of work — ordinary hours (s 62 FWA: maximum 38 ordinary hours plus reasonable additional hours)",
    "Base salary or hourly rate — must meet or exceed applicable Modern Award minimum",
    "Award reference — name of applicable Modern Award or Enterprise Agreement",
    "Superannuation — employer contribution rate (currently 11.5% — confirm current SG rate)",
    "Probationary period — typically 3 or 6 months (note: unfair dismissal access after minimum employment period)",
    "Annual leave — 4 weeks minimum (s 87 FWA)",
    "Personal/carer's leave — 10 days minimum (s 96 FWA)",
    "Notice of termination — meeting or exceeding s 117 FWA requirements by service period",
    "IP assignment — assignment of work product created in the course of employment",
    "Confidentiality obligations",
    "Post-employment restraints — if included: must be reasonable as to scope, duration, and geography",
    "Entire agreement clause",
    "Fair Work Information Statement — must be given to new employees (s 536 FWA)",
  ],
  jurisdictionNotes:
    "The Fair Work Act 2009 (Cth) applies to the national workplace relations system which " +
    "covers all private sector employers in all states except (historically) Western Australia, " +
    "though most WA employers are now covered. State public sector employees may be covered by " +
    "state industrial laws. Restraint of trade enforceability varies significantly by state — " +
    "New South Wales has the Restraints of Trade Act 1976 (NSW) which allows courts to read down " +
    "unreasonable restraints. Other states apply common law reasonableness test only.",
  draftingWarnings: [
    "CRITICAL — NES cannot be excluded: any term that purports to exclude or reduce an NES " +
    "entitlement is of no effect under s 61 FWA. The contract is treated as if the NES term applies.",
    "Modern Award interaction: if a Modern Award applies, the contract cannot provide for less " +
    "than Award minimums. Always identify the applicable Award and verify base rate.",
    "Restraint of trade: courts will NOT enforce restraints that are broader than necessary to " +
    "protect a legitimate business interest. Cascading clauses (multiple time/geography combinations) " +
    "are recommended to allow read-down. Restraints protecting confidential information and " +
    "customer connections have the strongest basis.",
    "Casual conversion: casual employees have conversion rights under s 66A FWA after 12 months. " +
    "Address this in the employment contract.",
    "Superannuation guarantee rate: currently 11.5% (2024-25), rising to 12% from 1 July 2025. " +
    "Do not hardcode a rate — refer to 'the superannuation guarantee rate from time to time' or " +
    "the contract will be out of date.",
    "Adverse action: broad confidentiality clauses or restraints that prevent employees from " +
    "exercising a workplace right (e.g., making a complaint) may breach s 340 FWA.",
  ],
  searchTerms: [
    "employment contract Fair Work Act NES minimum entitlements",
    "restraint of trade employment NSW Restraints of Trade Act",
    "modern award employment contract Fair Work",
    "superannuation guarantee rate 2024 2025",
    "casual employee conversion rights s66A Fair Work Act",
    "unfair dismissal minimum employment period Fair Work",
  ],
};

const SHAREHOLDERS_AGREEMENT: DocumentType = {
  id: "shareholders-agreement",
  name: "Shareholders Agreement",
  category: "commercial",
  description:
    "A contract between the shareholders of a company governing their relationship, " +
    "rights, and obligations. Works alongside (and must be consistent with) the Company " +
    "Constitution. Addresses share transfers, management, decision-making, and exit.",
  governingLegislation: [
    {
      name: "Corporations Act 2001 (Cth)",
      key_sections: [
        "s 9 (definitions — member, share, company)",
        "s 134 (replaceable rules or constitution)",
        "s 136 (adoption, modification, repeal of constitution)",
        "s 140 (effect of constitution — contract between company and members)",
        "s 180 (director duty of care and diligence)",
        "s 181 (duty of good faith)",
        "s 182 (duty not to improperly use position)",
        "s 198A (replaceable rule — directors to manage company)",
        "s 232 (oppression remedy — minority shareholder protection)",
        "s 249A–249X (meetings of members)",
        "s 254A–254X (shares — issue, transfer, cancellation)",
        "s 1071B (transfer of shares)",
      ],
    },
    {
      name: "Income Tax Assessment Act 1997 (Cth)",
      key_sections: [
        "Division 7A (loans to shareholders and associates — deemed dividends)",
        "s 974-75 (debt/equity test — affects classification of returns to shareholders)",
      ],
    },
  ],
  requiredElements: [
    "Parties — company and all shareholders (with shareholding details)",
    "Share structure — classes of shares, rights attaching to each class (voting, dividend, capital)",
    "Transfer restrictions — pre-emptive rights: Right of First Offer (ROFO) or Right of First Refusal (ROFR)",
    "Drag-along rights — majority can compel minority to sell on same terms",
    "Tag-along rights — minority can join in any majority sale on same terms",
    "Issue of new shares — pre-emptive rights on new issue (anti-dilution)",
    "Board composition — director appointment rights by shareholder class/threshold",
    "Reserved matters — decisions requiring unanimous or supermajority approval " +
      "(e.g., change of business, capital raising, related party transactions)",
    "Dividend policy — when and how dividends are declared",
    "Deadlock resolution — cooling off, CEO casting vote, buyout mechanism, wind up",
    "Shareholder loans — terms, interest, repayment (note Division 7A)",
    "Intellectual property — assignment of IP to company",
    "Confidentiality and non-compete obligations of shareholders",
    "Exit provisions — IPO, trade sale, winding up",
    "Valuation mechanism — for buyouts, transfers, and exits",
    "Dispute resolution",
    "Governing law",
  ],
  jurisdictionNotes:
    "The Corporations Act 2001 (Cth) applies nationally. The shareholders agreement must be " +
    "consistent with the company's Constitution. Where there is a conflict between the shareholders " +
    "agreement and the Constitution, the Constitution generally prevails as against third parties " +
    "(Corporations Act s 140). The shareholders agreement is contractual and only binds the parties " +
    "to it — it does not bind future shareholders unless they execute a deed of accession.",
  draftingWarnings: [
    "Constitution consistency: any provision in the shareholders agreement that contradicts the " +
    "Constitution is unenforceable against the company and third parties. Review and update the " +
    "Constitution to align with key shareholders agreement provisions, particularly share transfer " +
    "restrictions and director appointment rights.",
    "Oppression remedy: a provision that is oppressive or unfairly prejudicial to minority " +
    "shareholders may be challenged under s 232 Corporations Act. Ensure drag-along provisions " +
    "have fair pricing mechanisms.",
    "Division 7A: any loans from the company to shareholders must comply with Division 7A ITAA97 " +
    "(written loan agreement, minimum interest rate, maximum term) or the loan amount will be " +
    "treated as an unfranked dividend in the shareholder's hands.",
    "New shareholders: existing shareholders agreement will not bind new shareholders. " +
    "Include a deed of accession requirement — new shareholders must sign a deed of accession " +
    "before receiving shares.",
    "Deadlock: without a deadlock resolution mechanism in a 50/50 company, a deadlock can " +
    "render the company unmanageable. Russian Roulette or Texas Shoot-Out provisions are common.",
  ],
  searchTerms: [
    "shareholders agreement Corporations Act 2001 Australia",
    "drag-along tag-along shareholders agreement",
    "shareholders agreement oppression remedy s232",
    "company constitution shareholders agreement conflict",
    "Division 7A shareholder loans deemed dividend",
    "deed of accession shareholders agreement",
  ],
};

const COMMERCIAL_LEASE: DocumentType = {
  id: "commercial-lease",
  name: "Commercial Lease",
  category: "property",
  description:
    "A lease of commercial premises between a landlord and tenant. If the premises are " +
    "retail shop premises, the applicable State Retail Leases Act applies and imposes " +
    "mandatory requirements that cannot be contracted out of. Non-retail commercial " +
    "leases are governed by the Property Law Act and general contract law.",
  governingLegislation: [
    {
      name: "Retail Leases Act 1994 (NSW) / Retail Leases Act 2003 (Vic) / Retail Shop Leases Act 1994 (Qld)",
      key_sections: [
        "Mandatory disclosure requirements — Lessor Disclosure Statement",
        "Minimum 5-year lease term (some states)",
        "Prohibition on passing outgoings to tenant without disclosure",
        "Rent review restrictions (some states prohibit ratchet clauses)",
        "Assignment rights",
        "Fit-out contribution requirements",
        "Dispute resolution — state tribunal",
      ],
    },
    {
      name: "Property Law Act 1974 (Qld) / Property Law Act 1958 (Vic) / Conveyancing Act 1919 (NSW)",
      key_sections: [
        "Landlord's covenant for quiet enjoyment",
        "Implied covenants in leases",
        "Relief against forfeiture",
        "Assignment and subletting",
      ],
    },
    {
      name: "Real Property Act 1900 (NSW) / Transfer of Land Act 1958 (Vic) / Land Title Act 1994 (Qld)",
      key_sections: [
        "Registration of leases (required for leases over 3 years in most states)",
        "Priority of registered interests",
      ],
    },
  ],
  requiredElements: [
    "Parties — landlord (lessor) and tenant (lessee) with ABNs",
    "Premises description — exact legal description and location",
    "Term — commencement date, expiry date, options to renew",
    "Base rent — annual rent, payment frequency, method",
    "Rent review mechanism — choose one: CPI (Consumer Price Index), market review, fixed percentage increase, or ratchet (note: ratchet prohibited in some retail states)",
    "Options to renew — procedure, timing of exercise, rent on renewal",
    "Outgoings — which outgoings are passed to the tenant; disclosure requirements under retail acts",
    "Permitted use — specific and unambiguous description of permitted use",
    "Fit-out — tenant's fit-out obligations, landlord's contribution (if any), make-good on expiry",
    "Assignment and subletting — conditions and landlord's consent requirements",
    "Maintenance and repair obligations — landlord vs tenant responsibilities",
    "Insurance — tenant's public liability, plate glass, fit-out; landlord's building insurance",
    "Alterations — process for tenant to make alterations with landlord consent",
    "Default and termination provisions — notice requirements, cure periods",
    "Make-good obligations — restoration of premises to original condition on expiry",
    "GST clause — rent stated exclusive of GST",
    "Registration — obligation to register if term exceeds threshold (3 years in most states)",
    "Disclosure statement — mandatory under retail leases legislation if retail premises",
  ],
  jurisdictionNotes:
    "Retail lease legislation varies significantly by state. The definition of 'retail shop' and " +
    "the monetary thresholds for protection vary. In Queensland, the Retail Shop Leases Act 1994 " +
    "applies to shops in a retail shopping centre or that sell goods or provide services by retail. " +
    "In NSW, the Retail Leases Act 1994 applies. In Victoria, the Retail Leases Act 2003 applies. " +
    "In WA, the Commercial Tenancy (Retail Shops) Agreements Act 1985 applies. " +
    "Registration thresholds: NSW — leases over 3 years must be registered; VIC — leases over 3 years; " +
    "QLD — leases over 3 years.",
  draftingWarnings: [
    "Retail vs commercial distinction: always determine first whether the premises are 'retail' " +
    "under the applicable state Act. Retail leases have mandatory protections that cannot be " +
    "contracted out of. Drafting a retail lease as a plain commercial lease exposes the landlord " +
    "to significant liability.",
    "Disclosure obligations: retail leases in all states require a mandatory Lessor Disclosure " +
    "Statement to be provided to the tenant at least a specified number of days before the lease " +
    "is entered into. Failure to provide or late provision gives tenant rights to withdraw or " +
    "claim compensation.",
    "Ratchet clauses: some states (e.g., NSW) prohibit ratchet rent review clauses in retail leases " +
    "(i.e., rent cannot be reviewed below the current level). Do not include ratchet in retail leases " +
    "in those jurisdictions.",
    "Registration: unregistered leases over 3 years are not binding on a subsequent purchaser of " +
    "the land without actual notice. Always advise the tenant to register leases of significant term.",
    "Make-good: make-good clauses can lead to significant disputes. Be specific about the standard " +
    "required — 'original condition' vs 'good repair and condition' vs 'landlord satisfaction'.",
    "Outgoings: be specific about which outgoings are payable. A general 'all outgoings' clause " +
    "in a retail lease may be unenforceable for outgoings not disclosed in the disclosure statement.",
  ],
  searchTerms: [
    "retail shop lease Act Queensland NSW Victoria",
    "commercial lease outgoings disclosure retail leases Act",
    "commercial lease registration land title Act",
    "retail lease ratchet rent review prohibition",
    "commercial lease make-good obligations",
    "retail leases Act disclosure statement requirements",
  ],
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const DOCUMENT_TYPE_REGISTRY: DocumentType[] = [
  // Trusts
  DISCRETIONARY_TRUST_DEED,
  UNIT_TRUST_DEED,
  // Family Law
  BFA_MARRIED,
  BFA_DEFACTO,
  CONSENT_ORDERS,
  SEPARATION_AGREEMENT,
  // Commercial & Employment
  SERVICE_AGREEMENT,
  EMPLOYMENT_CONTRACT,
  SHAREHOLDERS_AGREEMENT,
  COMMERCIAL_LEASE,
];

/**
 * Look up a document type by its id.
 * Returns undefined if not found — caller should handle this gracefully.
 */
export function getDocumentType(id: string): DocumentType | undefined {
  return DOCUMENT_TYPE_REGISTRY.find((d) => d.id === id);
}

/**
 * List all document types, optionally filtered by category.
 */
export function listDocumentTypes(
  category?: DocumentType["category"]
): DocumentType[] {
  if (!category) return DOCUMENT_TYPE_REGISTRY;
  return DOCUMENT_TYPE_REGISTRY.filter((d) => d.category === category);
}
