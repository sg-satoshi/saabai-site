/**
 * Lex Document Type Registry
 *
 * Each entry defines what law governs a document, what elements are required,
 * jurisdiction-specific notes, and what to search during drafting.
 *
 * Used by the /api/lex-draft route to guide the two-pass drafting process.
 */

export interface DocumentType {
  id: string;
  name: string;
  category: "trust" | "family-law" | "commercial" | "employment" | "property";
  description: string;
  governingLegislation: { name: string; keySections: string[] }[];
  requiredElements: string[];
  jurisdictionNotes: string;
  draftingWarnings: string[];
  searchTerms: string[];
}

export const DOCUMENT_TYPES: DocumentType[] = [
  // ── Trusts ─────────────────────────────────────────────────────────────────

  {
    id: "discretionary-trust-deed",
    name: "Discretionary (Family) Trust Deed",
    category: "trust",
    description:
      "A trust deed establishing a discretionary trust, typically used for asset protection, tax planning, and intergenerational wealth transfer. The trustee has absolute discretion to distribute income and capital among a defined beneficiary class.",
    governingLegislation: [
      {
        name: "Income Tax Assessment Act 1997 (Cth)",
        keySections: ["102AG", "Subdiv 207-B", "Division 6", "s97", "s98", "s99A", "s100A"],
      },
      {
        name: "Taxation Administration Act 1953 (Cth)",
        keySections: [],
      },
      {
        name: "Corporations Act 2001 (Cth)",
        keySections: ["s9", "s180", "s181", "s182"],
      },
    ],
    requiredElements: [
      "Name of trust and establishment date",
      "Identification of the settlor and settlement sum",
      "Appointment of trustee (individual or corporate trustee)",
      "Beneficiary class: primary and default beneficiaries",
      "Trust fund definition",
      "Trustee powers: investment, borrowing, distribution",
      "Income distribution provisions and trustee discretion",
      "Capital distribution provisions",
      "Variation and amendment powers",
      "Vesting date (max 80 years in most states)",
      "Resettlement clause and protections",
      "Trustee indemnity and exoneration provisions",
      "Trustee removal and replacement provisions",
      "Execution formalities: signing by settlor and trustee",
    ],
    jurisdictionNotes:
      "Queensland: trust deeds generally exempt from stamp duty. NSW: dutiable, stamp duty payable on establishment. Victoria: dutiable, stamp duty applies to trust deeds and declarations of trust. WA: dutiable. SA, TAS, ACT, NT: vary, confirm current duty position. All jurisdictions: trust resolutions required annually before 30 June to stream income.",
    draftingWarnings: [
      "Post-2011 streaming rules (Subdiv 207-B ITAA97): specifically preserve streaming of franked dividends and capital gains",
      "Section 100A ITAA97 reimbursement agreement risk: ensure genuine present entitlement",
      "Trust tax reform: ATO guidance on Section 100A from May 2022, draft broad trustee discretion carefully",
      "Penn v Downie [2005] NSWSC 608: three certainties must be satisfied: intention, subject matter, objects",
      "Corporate trustee preferred for asset protection: avoid sole director/shareholder structure",
      "Vesting date: do not exceed 80 years (rule against perpetuities)",
      "Avoid unit-holder beneficiary drafting that could trigger fixed trust treatment",
    ],
    searchTerms: [
      "discretionary trust deed drafting requirements Australia",
      "section 100A ITAA97 trust income reimbursement",
      "trust income streaming franked dividends capital gains",
      "discretionary trust vesting date rule against perpetuities",
    ],
  },

  {
    id: "unit-trust-deed",
    name: "Unit Trust Deed",
    category: "trust",
    description:
      "A trust deed establishing a unit trust, where beneficial interests are divided into units held by unit holders. Commonly used for property investment, joint ventures, and managed funds.",
    governingLegislation: [
      {
        name: "Income Tax Assessment Act 1997 (Cth)",
        keySections: ["Division 6", "s97", "s102AC", "s104-75 CGT Event E4"],
      },
      {
        name: "Corporations Act 2001 (Cth)",
        keySections: ["Chapter 5C", "s9", "s601GA"],
      },
    ],
    requiredElements: [
      "Trust name and establishment date",
      "Settlor and settlement sum",
      "Trustee appointment",
      "Unit structure: number of units and classes",
      "Unit register provisions",
      "Issue and redemption of units",
      "Unit holder rights: voting, income, capital",
      "Income distribution proportionate to unit holdings",
      "Capital distribution on winding up",
      "Transfer of units: pre-emptive rights and restrictions",
      "Trustee powers and investment mandate",
      "Meeting provisions for unit holders",
      "Amendment and winding up provisions",
      "Vesting date",
    ],
    jurisdictionNotes:
      "Managed investment scheme registration under Chapter 5C of Corporations Act may apply if more than 20 investors or if promoted to retail clients. Stamp duty on unit transfers applies in most states. CGT Event E4 applies on non-assessable distributions reducing cost base of units.",
    draftingWarnings: [
      "If unit trust has more than 20 investors or constitutes a managed investment scheme, ASIC registration may be required under Chapter 5C Corporations Act 2001",
      "CGT Event E4: non-assessable amounts paid from trust can reduce cost base of units",
      "Fixed trust status: ensure income entitlement is proportionate to unit holdings for tax purposes",
      "Unit trust used for property: consider land tax implications in each state",
    ],
    searchTerms: [
      "unit trust deed Australia requirements",
      "unit trust managed investment scheme registration",
      "CGT Event E4 unit trust distributions",
      "unit trust fixed trust proportionate entitlement",
    ],
  },

  // ── Family Law ─────────────────────────────────────────────────────────────

  {
    id: "bfa-married",
    name: "Binding Financial Agreement (Married Couples)",
    category: "family-law",
    description:
      "A binding financial agreement under Part VIIIA of the Family Law Act 1975 (Cth) for married couples. Can be made before marriage (prenuptial), during marriage, or after separation. Excludes the court's jurisdiction over property and spousal maintenance.",
    governingLegislation: [
      {
        name: "Family Law Act 1975 (Cth)",
        keySections: ["s90B", "s90C", "s90D", "s90G", "s90K", "s90KA"],
      },
    ],
    requiredElements: [
      "Timing of the agreement (before marriage s90B, during marriage s90C, post-separation s90D)",
      "Property pool description: all property owned by each party",
      "Division of property on breakdown of marriage",
      "Spousal maintenance provisions or exclusion thereof",
      "Statement that independent legal advice was received by each party",
      "Certificates of independent legal advice from each party's solicitor",
      "Signed by both parties",
      "Effective date provisions",
    ],
    jurisdictionNotes:
      "Federal jurisdiction under Family Law Act 1975 (Cth), applies uniformly across Australia except WA for de facto couples. BFA applies to married couples nationally.",
    draftingWarnings: [
      "Section 90G: both parties must sign, each must receive independent legal advice before signing, each adviser must provide a certificate, each party must receive a signed copy",
      "Failure to comply with s90G requirements renders the agreement void with no exceptions",
      "Section 90K: court can set aside for duress, fraud, unconscionable conduct, or changed circumstances",
      "Thorne v Kennedy [2017] HCA 49: duress and unconscionable conduct can invalidate a BFA even if procedural requirements were met",
      "Full and frank disclosure of assets required: failure to disclose can ground setting aside",
    ],
    searchTerms: [
      "binding financial agreement section 90G requirements",
      "BFA independent legal advice certificate requirements",
      "Thorne v Kennedy unconscionable conduct BFA",
      "binding financial agreement set aside section 90K",
    ],
  },

  {
    id: "bfa-defacto",
    name: "Binding Financial Agreement (De Facto Couples)",
    category: "family-law",
    description:
      "A binding financial agreement under Part VIIIAB of the Family Law Act 1975 (Cth) for de facto couples, including same-sex couples. Can be made before, during, or after the de facto relationship.",
    governingLegislation: [
      {
        name: "Family Law Act 1975 (Cth)",
        keySections: ["s90UB", "s90UC", "s90UD", "s90UG", "s90UK", "s90UKA", "s4AA"],
      },
    ],
    requiredElements: [
      "Declaration that parties are or were in a de facto relationship",
      "State or territory of the de facto relationship for jurisdiction",
      "Property description for each party",
      "Division of property on breakdown of relationship",
      "Maintenance provisions",
      "Independent legal advice certificates",
      "Signed by both parties",
    ],
    jurisdictionNotes:
      "Part VIIIAB applies in all states and territories except WA. De facto property matters in WA are governed by Family Court Act 1997 (WA) Part 5A. De facto relationship must satisfy s4AA criteria: two-year rule or child of relationship exception.",
    draftingWarnings: [
      "Western Australia: NOT governed by Family Law Act for de facto couples, governed by Family Court Act 1997 (WA) s205Z onwards with different requirements",
      "Section 90UG: same strict formal requirements as s90G for married couples",
      "Section 4AA: confirm de facto relationship exists (genuine domestic basis, two years or registered relationship)",
      "De facto relationship must have geographic connection to participating jurisdiction",
    ],
    searchTerms: [
      "binding financial agreement de facto section 90UG requirements",
      "de facto relationship section 4AA Family Law Act",
      "de facto BFA Western Australia different requirements",
    ],
  },

  {
    id: "financial-settlement-consent-orders",
    name: "Financial Settlement Consent Orders",
    category: "family-law",
    description:
      "Orders made by consent under the Family Law Act 1975 (Cth) for property division, spousal maintenance, and superannuation splitting after separation. Approved by the Federal Circuit and Family Court of Australia.",
    governingLegislation: [
      {
        name: "Family Law Act 1975 (Cth)",
        keySections: ["s79", "s79A", "s75(2)", "s87", "s90MT"],
      },
      {
        name: "Family Law Rules 2021 (Cth)",
        keySections: ["Part 10.1 consent orders"],
      },
    ],
    requiredElements: [
      "Application for Consent Orders (approved form)",
      "Statement of Proposed Orders",
      "Financial Statement for each party (Form 13 or 13A)",
      "Details of all property, liabilities, and superannuation",
      "Just and equitable assessment under s79(2)",
      "Property transfer orders with stamp duty exemption reliance",
      "Superannuation splitting orders if applicable",
      "Spousal maintenance orders or clean break clause",
      "Execution by both parties and each party's solicitor",
    ],
    jurisdictionNotes:
      "Federal Circuit and Family Court of Australia has jurisdiction. Stamp duty exemption available on property transfers pursuant to consent orders under s90AE Family Law Act in all states. Superannuation splitting requires serving the fund trustee.",
    draftingWarnings: [
      "Just and equitable requirement under s79(2): court must be satisfied orders are just and equitable before approving",
      "Full financial disclosure required: Form 13/13A financial statements must be accurate and complete",
      "Superannuation splitting: service on fund trustee required with specific procedural steps under Part VIIIB",
      "Limitation period: 12 months after divorce, 2 years after de facto relationship ends",
      "Section 79A: limited grounds to set aside consent orders after approval",
    ],
    searchTerms: [
      "consent orders property settlement family law Australia",
      "section 79 just equitable property adjustment",
      "superannuation splitting orders consent Family Law Act",
    ],
  },

  {
    id: "separation-agreement",
    name: "Separation Agreement (Heads of Agreement)",
    category: "family-law",
    description:
      "A non-binding heads of agreement recording agreed terms of separation. Used to document interim arrangements pending formal consent orders or a binding financial agreement.",
    governingLegislation: [
      {
        name: "Family Law Act 1975 (Cth)",
        keySections: ["s79", "s75(2)"],
      },
    ],
    requiredElements: [
      "Clear statement that the agreement is NOT a binding financial agreement",
      "Date of separation",
      "Living and parenting arrangements",
      "Interim property arrangements",
      "Agreed outline of asset division",
      "Steps to formalise arrangements (consent orders or BFA)",
      "Signed by both parties",
    ],
    jurisdictionNotes:
      "Not enforceable as a binding financial agreement. Not approved by the court. Useful as an interim document or as evidence of agreed terms to support consent orders.",
    draftingWarnings: [
      "Must include a clear statement that this is NOT a binding financial agreement under the Family Law Act",
      "Cannot exclude court jurisdiction: only a BFA or approved consent orders can do this",
      "Cannot be used to transfer property with stamp duty exemption",
      "Solicitor must advise client clearly this document does not provide legal certainty",
    ],
    searchTerms: [
      "separation agreement Australia not binding financial agreement",
      "heads of agreement family law separation interim arrangements",
    ],
  },

  // ── Commercial ─────────────────────────────────────────────────────────────

  {
    id: "service-agreement",
    name: "Service Agreement",
    category: "commercial",
    description:
      "A contract for the provision of services between a supplier and client. Covers scope of services, fees, intellectual property, liability, and termination.",
    governingLegislation: [
      {
        name: "Australian Consumer Law (Schedule 2, Competition and Consumer Act 2010 (Cth))",
        keySections: ["s18 misleading conduct", "s21 unconscionable conduct", "s23 unfair contract terms", "s24"],
      },
    ],
    requiredElements: [
      "Parties: full legal names and ABN or ACN",
      "Scope of services: detailed description",
      "Fees and payment terms",
      "Invoicing and GST provisions",
      "Intellectual property ownership: background IP and foreground IP",
      "Confidentiality obligations",
      "Liability cap and exclusions",
      "Indemnity provisions",
      "Termination: for convenience and for cause",
      "Dispute resolution: escalation and mediation or arbitration",
      "Governing law and jurisdiction",
      "Entire agreement and variation provisions",
    ],
    jurisdictionNotes:
      "Unfair contract terms regime under ACL applies to small business contracts. From 9 November 2023, unfair terms are void and contravention attracts penalties. Review liability cap, unilateral variation, and automatic renewal clauses.",
    draftingWarnings: [
      "Unfair contract terms: from November 2023, small business contracts subject to penalties for unfair terms",
      "IP ownership must be explicit: default position at common law is that contractor retains IP in works created",
      "GST: all fees must specify whether inclusive or exclusive of GST",
      "Consumer guarantees under ACL cannot be excluded for consumer contracts",
    ],
    searchTerms: [
      "service agreement Australia unfair contract terms ACL",
      "intellectual property ownership contractor agreement Australia",
      "unfair contract terms small business November 2023 amendments",
    ],
  },

  {
    id: "shareholders-agreement",
    name: "Shareholders Agreement",
    category: "commercial",
    description:
      "An agreement between shareholders of a company governing their rights and obligations, share transfers, management decisions, and exit mechanisms. Supplements the company's constitution.",
    governingLegislation: [
      {
        name: "Corporations Act 2001 (Cth)",
        keySections: ["s9", "s112", "s136", "s140", "s180", "s181", "s182", "s232", "s233", "s461"],
      },
    ],
    requiredElements: [
      "Parties: each shareholder and the company",
      "Shareholding structure: number and class of shares",
      "Management and board composition",
      "Reserved matters: decisions requiring unanimous or supermajority consent",
      "Dividend policy",
      "Share transfer restrictions: pre-emptive rights, drag-along, tag-along",
      "Deadlock resolution mechanism",
      "Exit provisions: put and call options, buyout mechanisms",
      "Restraint of trade provisions",
      "Confidentiality",
      "Founder vesting schedule if applicable",
      "Relationship with company constitution",
      "Governing law",
    ],
    jurisdictionNotes:
      "Governed by Corporations Act 2001 (Cth). The shareholders agreement operates alongside the company constitution. ASIC lodgment is not required for a shareholders agreement.",
    draftingWarnings: [
      "Oppression remedy under s232 and s233: minority shareholder protections cannot be fully excluded",
      "Restraint of trade must be reasonable as to geographic scope, duration, and activity",
      "Director duties under ss180 to 182 apply regardless of shareholders agreement provisions",
      "Share valuation methodology for buyout must be clearly defined to avoid disputes",
      "Drag-along provisions must be carefully balanced against minority shareholder protections",
    ],
    searchTerms: [
      "shareholders agreement Australia Corporations Act",
      "shareholders agreement pre-emptive rights drag along tag along",
      "oppression remedy section 232 Corporations Act minority shareholder",
    ],
  },

  // ── Employment ─────────────────────────────────────────────────────────────

  {
    id: "employment-contract",
    name: "Employment Contract",
    category: "employment",
    description:
      "A contract of employment establishing the terms and conditions of employment, including remuneration, duties, leave entitlements, and post-employment restraints.",
    governingLegislation: [
      {
        name: "Fair Work Act 2009 (Cth)",
        keySections: ["s44 NES", "s45", "Part 2-2", "s62", "s67", "s87", "s96", "s117"],
      },
      {
        name: "Fair Work Regulations 2009 (Cth)",
        keySections: [],
      },
    ],
    requiredElements: [
      "Parties: employer entity (ABN or ACN) and employee full name",
      "Position title and duties",
      "Start date",
      "Employment type: full-time, part-time, or casual",
      "Place of work",
      "Remuneration: base salary or rate, superannuation (11.5% from 1 July 2024)",
      "Hours of work",
      "Applicable modern award or enterprise agreement or award-free status",
      "Leave entitlements referencing NES as minimum",
      "Probationary period provisions",
      "Confidentiality and IP assignment",
      "Post-employment restraints: non-compete and non-solicitation",
      "Termination provisions: notice periods meeting or exceeding NES",
      "Entire agreement clause",
    ],
    jurisdictionNotes:
      "National System covers most private sector employees in all states and territories under Fair Work Act 2009 (Cth). Western Australia: sole traders, partnerships, and unincorporated entities remain under WA state system. Modern award coverage must be checked for applicable award.",
    draftingWarnings: [
      "National Employment Standards are a minimum floor and cannot be contracted out of",
      "Superannuation guarantee rate: 11.5% from 1 July 2024, increasing to 12% from 1 July 2025",
      "Casual conversion rights under s65A: employer must offer conversion after 6 months of regular and systematic work",
      "Restraint of trade post-employment must be reasonable as to scope, duration, and geography",
      "Notice periods in contract must meet or exceed NES notice periods in s117",
      "Always check whether a modern award applies before drafting remuneration",
    ],
    searchTerms: [
      "employment contract Australia Fair Work Act NES minimum entitlements",
      "restraint of trade post-employment non-compete Australia enforceability",
      "casual conversion Fair Work Act 2009 section 65A",
      "superannuation guarantee rate 2024 2025",
    ],
  },

  // ── Property ───────────────────────────────────────────────────────────────

  {
    id: "commercial-lease",
    name: "Commercial Lease",
    category: "property",
    description:
      "A lease of commercial premises for business purposes. Covers the rights and obligations of landlord and tenant, rent, outgoings, permitted use, fit-out, and end of lease provisions.",
    governingLegislation: [
      {
        name: "Retail Leases Act 1994 (NSW)",
        keySections: ["s3", "s16", "s35", "s62B"],
      },
      {
        name: "Retail Leases Act 2003 (VIC)",
        keySections: ["s17", "s21"],
      },
      {
        name: "Retail Shop Leases Act 1994 (QLD)",
        keySections: ["s21C", "s22"],
      },
    ],
    requiredElements: [
      "Parties: landlord and tenant legal names",
      "Premises description: full address and lot or plan reference",
      "Permitted use",
      "Term: commencement date, expiry date, options to renew",
      "Rent and rent review mechanism (CPI, fixed increases, or market review)",
      "Outgoings: landlord and tenant obligations",
      "Fitout and make-good obligations",
      "Assignment and subletting provisions",
      "Insurance requirements",
      "Default and termination provisions",
      "Dispute resolution",
      "Registration if term exceeds 3 years",
    ],
    jurisdictionNotes:
      "Retail Leases Acts apply in each state when premises are a retail shop. Thresholds and definitions vary by state. NSW: Retail Leases Act 1994, mandatory disclosure, minimum 5-year term for retail leases. VIC: Retail Leases Act 2003, mandatory disclosure statement. QLD: Retail Shop Leases Act 1994.",
    draftingWarnings: [
      "Confirm whether Retail Leases Act applies before drafting, as specific disclosure obligations and minimum terms must be met",
      "NSW: landlord must provide disclosure statement at least 7 days before lease execution",
      "Land tax inclusion in outgoings is restricted under retail leases legislation in NSW and VIC",
      "Leases exceeding 3 years should be registered to bind future owners of the land",
      "Option to renew notice periods must be clear: failure to give notice on time can result in loss of option",
    ],
    searchTerms: [
      "commercial lease Australia retail leases act disclosure",
      "commercial lease outgoings land tax restriction retail",
      "commercial lease make good obligations Australia",
    ],
  },
];

export function getDocumentType(id: string): DocumentType | undefined {
  return DOCUMENT_TYPES.find((d) => d.id === id);
}

export function getDocumentTypesByCategory(
  category: DocumentType["category"]
): DocumentType[] {
  return DOCUMENT_TYPES.filter((d) => d.category === category);
}
