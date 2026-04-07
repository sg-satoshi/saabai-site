/**
 * Lex Knowledge Base — Tributum Law
 *
 * Architecture: single full-context injection
 *
 * At current scale, full-context injection with Anthropic prompt caching
 * is faster than tool-based retrieval. Cached tokens are read nearly instantly,
 * while each tool call adds ~0.5–1s of round-trip latency.
 *
 * Sections:
 *   1. Firm Context
 *   2. Australian Tax Law
 *   3. International Tax Law
 *   4. International Relocation & Tax Residency
 *   5. Wills, Estates & Succession with International Assets
 *   6. Asset Protection
 *   7. Lead Qualification Signals
 *   8. Disclaimer Framework
 */

export const LEX_KNOWLEDGE = `
================================================================================
LEX KNOWLEDGE BASE — TRIBUTUM LAW
Last updated: April 2026
================================================================================

────────────────────────────────────────────────────────────────────────────────
SECTION 1 — TRIBUTUM LAW: FIRM CONTEXT
────────────────────────────────────────────────────────────────────────────────

## About Tributum Law

Tributum Law (www.tributumlaw.com) is an Australian law firm specialising in:
- Australian and international tax law
- Cross-border corporate and trust structures
- Asset protection planning
- Wills, estates, and succession with international assets
- Offshore compliance (CRS, FATCA, FBAR)
- Foreign investment into Australia (FIRB)

The firm acts for high-net-worth individuals, Australian expats, inbound foreign investors,
family offices, and private business owners navigating complex tax and succession matters.

### Contact Details
- General enquiries: hello@tributumlaw.com
- Website: www.tributumlaw.com
- Consultation bookings: https://tributumlaw.com/contact-us
- Lex is Tributum Law's AI assistant — representing the firm in all interactions

### Positioning
Tributum Law is the specialist of choice when the matter crosses a border, involves
significant assets, or requires a lawyer who understands both Australian domestic law
and the international tax landscape. The firm does not handle routine conveyancing,
family law, or criminal matters — it focuses exclusively on tax, estates, and structures.

When a visitor's situation is complex, involves international dimensions, or involves
material assets, Lex should position a Tributum consultation as the logical next step.


────────────────────────────────────────────────────────────────────────────────
SECTION 2 — AUSTRALIAN TAX LAW
────────────────────────────────────────────────────────────────────────────────

## 2.1 Legislative Framework

The primary income tax legislation in Australia comprises two statutes:

**Income Tax Assessment Act 1997 (ITAA 1997)**
The principal modern Act. Contains:
- Capital Gains Tax (CGT) provisions (Part 3-1 and 3-3)
- Small business concessions (Division 152)
- Trust provisions
- Deduction rules (Division 8)
- Imputation (franking credits) — Division 207

**Income Tax Assessment Act 1936 (ITAA 1936)**
The older Act, still operative for key provisions:
- Division 7A (loans from private companies)
- Part IVA (general anti-avoidance rule)
- Trust taxing provisions (Division 6)
- Controlled Foreign Company rules (Part X)
- Transfer Pricing (Division 13 — now largely replaced by Subdivisions 815-B/C/D)

Both Acts are administered by the Australian Taxation Office (ATO).
Tax Administration Act 1953 governs compliance, penalties, and objection rights.

---

## 2.2 Individual Income Tax Rates (2024–25)

Australian residents pay progressive income tax:

| Taxable Income         | Tax Rate                                  |
|------------------------|-------------------------------------------|
| $0 – $18,200           | Nil (tax-free threshold)                  |
| $18,201 – $45,000      | 19c for each $1 over $18,200              |
| $45,001 – $120,000     | $5,092 + 32.5c for each $1 over $45,000  |
| $120,001 – $180,000    | $29,467 + 37c for each $1 over $120,000  |
| $180,001+              | $51,667 + 45c for each $1 over $180,000  |

**Medicare Levy**: 2% of taxable income (with low-income phase-in reduction).
**Medicare Levy Surcharge**: 1–1.5% for high-income earners without private hospital cover.

Low Income Tax Offset (LITO): up to $700 for incomes below $37,500 (phases out).
Low and Middle Income Tax Offset (LMITO): discontinued from 2022–23.

**Top Effective Rate**: 47% (45% + 2% Medicare levy).
**Company Tax Rate**: 30% (general); 25% for base rate entities (aggregated turnover < $50m).

---

## 2.3 Capital Gains Tax (CGT)

CGT is not a separate tax — it is part of income tax. Capital gains are included in
assessable income in the year the CGT event occurs (ITAA 1997, Part 3-1).

**CGT Discount (s115-100)**
- For individuals and trusts: 50% discount on capital gains from assets held > 12 months
- For complying superannuation funds: 33.33% discount
- For companies: no CGT discount

**Main Residence Exemption (s118-110)**
- Full exemption if the dwelling was your main residence for the entire ownership period
  and was not used to produce income
- Partial exemption applies if any part of the period it was rented or used for business
- Apportionment on a time or floor-area basis depending on circumstances
- Foreign residents: the main residence exemption has been significantly restricted since
  9 May 2017 — foreign residents can generally no longer access the main residence exemption
  on disposal unless they satisfy a "life events" test during the last 6 years of ownership

**Common CGT Events**
- CGT Event A1: disposal of a CGT asset (most common)
- CGT Event C2: expiry of an intangible asset (options, leases)
- CGT Event E1/E2: creation of trusts; transfer of assets to trust
- CGT Event K6: pre-CGT assets — affects valuation on death

**Cost Base**
Five elements: original purchase price + incidental costs of acquisition + holding costs +
costs of ownership (rates, interest if no income deduction claimed) + costs of disposal.

**CGT Rollover Provisions**
- Marriage/relationship breakdown: s126-5 rollover — no CGT on transfer between spouses
- Small business rollover (s152-410): defer gain from active asset replacement
- Scrip-for-scrip (s124-780): shares/units exchanged in mergers/restructures

---

## 2.4 Goods and Services Tax (GST)

**Rate**: 10% on taxable supplies of goods, services, real property, and other things.

**Key Legislation**: A New Tax System (Goods and Services Tax) Act 1999.

**Registration**: Mandatory if annual turnover ≥ $75,000 (general); $150,000 for non-profit bodies.
Voluntary registration is possible below the threshold.

**GST-Free Supplies** (Schedule 1 of the GST Act): food (basic), health services, education,
exports of goods and services (zero-rated for export purposes), financial supplies (input taxed).

**Input Tax Credits**: Registered entities claim credits for GST paid on business acquisitions.

**BAS (Business Activity Statement)**: Filed monthly (if turnover > $20m), quarterly, or annually.
GST, PAYG withholding, and PAYG instalments are reported on BAS.

**Real Property**:
- Sale of new residential premises: taxable supply (GST applies)
- Sale of existing residential premises: input taxed (no GST on sale, no input tax credits)
- Commercial property: taxable; margin scheme available in some cases
- GST withholding: buyers of new residential premises must withhold GST from the vendor
  and pay it directly to the ATO (effective from 1 July 2018)

---

## 2.5 Fringe Benefits Tax (FBT)

**Rate**: 47% (aligned with top marginal rate + Medicare levy equivalent) on the "grossed-up"
taxable value of fringe benefits.

**FBT Year**: 1 April – 31 March (different from income tax year).
**Return**: Due 21 May (or later if lodged through a tax agent).

**Common Fringe Benefits**:
- Cars (statutory formula or operating cost method)
- Entertainment (meals, recreation)
- Low-interest loans
- Living-away-from-home allowances (LAFHA)

**Reportable Fringe Benefits**: If an employee receives > $2,000 grossed-up value of FBT,
the employer must report a "reportable fringe benefit amount" on the payment summary/income
statement. This affects the employee's Medicare Levy Surcharge, HELP repayment, and other
means-tested calculations.

**Salary Packaging**: Employees can sacrifice salary for benefits below the FBT threshold
(e.g. portable electronic devices exempt up to one per year per category).

---

## 2.6 Superannuation

Superannuation is Australia's mandatory retirement savings system, governed by the
Superannuation Industry (Supervision) Act 1993 (SIS Act).

**Superannuation Guarantee (SG)**: Employers must contribute 11.5% of ordinary time earnings
(2024–25). Rising to 12% from 1 July 2025.

**Concessional Contributions (CC)**: Employer contributions, salary sacrificed contributions,
and personal deductible contributions. Taxed at 15% inside the fund.
- Annual cap: $30,000 (2024–25)
- Carry-forward unused cap: available if total super balance (TSB) < $500,000; can use
  up to 5 years' worth of unused concessional cap

**Non-Concessional Contributions (NCC)**: After-tax contributions (no deduction claimed).
- Annual cap: $120,000 (2024–25)
- Bring-forward rule: eligible individuals (TSB < $1.66m) can bring forward 3 years
  ($360,000 in one year)
- If TSB ≥ $1.9m: NCCs are nil

**Division 293 Tax**: Additional 15% tax on concessional contributions for income > $250,000
(total income including concessional contributions).

**Pension Phase**:
- Account-based pensions: fund earnings tax-free; minimum draw-down rates apply
- Transfer Balance Cap (TBC): $1.9m (2024–25) — limits amount that can be moved to pension phase
- Excess over TBC: must be retained in accumulation phase (earnings taxed at 15%)

**Self-Managed Superannuation Funds (SMSFs)**: See Section 6 (Asset Protection).

---

## 2.7 Division 7A — Loans from Private Companies

**Legislation**: Division 7A, ITAA 1936 (s109D–s109ZD)

Division 7A deems certain payments, loans, and debt forgiveness by private companies to
their shareholders (or associates) to be unfranked dividends, assessable in the shareholder's hands.

**When it applies**: A private company makes a loan, payment, or forgives a debt to:
- A shareholder
- An associate of a shareholder (spouse, relative, related trust)

**Complying Loan Agreements**: Division 7A loans can be made without triggering a deemed
dividend if a written loan agreement is in place, the loan is repaid within 7 years (25 years
for loans secured by real property), and the ATO benchmark interest rate is charged.
(2024–25 benchmark rate: 8.77%)

**Common Issues**:
- Unpaid trust distributions to a corporate beneficiary: if not paid within the required period,
  treated as a Division 7A loan (following UPE rules from TR 2010/3 and subsequent amendments)
- Personal expenses paid by a company for a shareholder director

**Franking Credits**: Dividends arising from Division 7A are unfranked — no credits attached.

**Board of Taxation Review**: Division 7A is subject to ongoing reform consultation. Practitioners
should monitor ATO guidance for updates.

---

## 2.8 Trust Taxation

Trusts are not a separate taxable entity under Australian law — the income is assessed
either in the hands of beneficiaries (Division 6, ITAA 1936) or in the hands of the trustee.

**Types of Trusts**:

*Discretionary (Family) Trusts*: Trustee has absolute discretion to distribute income and capital
to beneficiaries. No fixed entitlements. Key vehicle for family wealth holding and tax planning.

*Unit Trusts*: Beneficiaries hold units; income distributed proportionally to unit holdings.
Treated more like companies for some purposes (no CGT discount if unit trust is "widely held").

*Fixed Trusts*: Beneficiaries have fixed entitlements to income and capital.

**Trust Streaming**: Following Bamford (2010), trusts can "stream" specific types of income
(e.g. capital gains, franked dividends) to particular beneficiaries provided the trust deed
and distribution resolution permit it. Tax Act amendments now allow streaming of capital gains
and franked distributions under specific conditions.

**Section 100A (ITAA 1936)**:
Anti-avoidance provision targeting arrangements where a beneficiary (often a lower-tax-rate
entity or individual) is made presently entitled to trust income, but the economic benefit
is enjoyed by another person.

If s100A applies: the trustee is assessed on the distribution at the top marginal rate (47%).

The ATO's 2022 guidance (TR 2022/4 and PCG 2022/2) significantly clarified and tightened
the ATO's approach. Key risk factors:
- Lower-rate beneficiary (e.g. adult child or bucket company) receiving distributions they
  do not actually use or benefit from
- Arrangements that lack "ordinary family or commercial dealing" character
- Corporate beneficiary UPEs not subject to complying Division 7A loan agreements

**Trustee Assessed**: If no beneficiary is presently entitled to income by 30 June, the trustee
is assessed at 47% on all net income.

**Foreign Trusts / Non-Resident Beneficiaries**: Different withholding rules apply.

---

## 2.9 Small Business CGT Concessions

Available to "small business entities" (aggregated turnover < $10m) or if net assets ≤ $6m
(excluding superannuation, principal home). Governed by Division 152, ITAA 1997.

**Active Asset Test**: The asset must have been an active asset (used in a business) for either:
- At least 7.5 years (if owned > 15 years), or
- At least half the ownership period

**The Four Concessions** (can be stacked):

1. **15-Year Exemption (s152-B)**: Full CGT exemption if asset held ≥ 15 years AND individual is
   ≥ 55 years old (or permanently incapacitated), and disposing for retirement purposes.
   No tax on the gain at all. Can be contributed to superannuation (up to lifetime cap: $1.705m).

2. **Active Asset Reduction (s152-C)**: 50% reduction in the capital gain (in addition to the
   50% general CGT discount for individuals). Net result: 75% reduction for individuals who
   held the asset > 12 months.

3. **Retirement Exemption (s152-D)**: Exempt up to $500,000 lifetime per individual. If under 55,
   the amount must be contributed to superannuation. Can be used even if asset held < 12 months.

4. **Rollover (s152-E)**: Defer the gain for up to 2 years (or longer if replacement asset acquired).
   Used when reinvesting sale proceeds into a new active business asset.

**Key Eligibility**: The taxpayer must be a CGT "small business entity" or connected entity, and
the basic conditions in s152-10 must be satisfied including the maximum net asset value test.


────────────────────────────────────────────────────────────────────────────────
SECTION 3 — INTERNATIONAL TAX LAW
────────────────────────────────────────────────────────────────────────────────

## 3.1 Double Tax Agreements (DTAs)

Australia has entered into over 40 bilateral tax treaties (Double Tax Agreements) designed to
prevent the same income being taxed twice — once in Australia and once in the other country.

**How DTAs Work**:
- DTAs allocate taxing rights between countries for different categories of income
  (business profits, dividends, interest, royalties, employment income, pensions, capital gains)
- DTAs typically reduce or eliminate withholding tax rates on cross-border income flows
- DTAs include tie-breaker rules for dual tax residency situations
- Australia's DTAs generally follow the OECD Model Tax Convention

**Key Treaty Partners and Withholding Rates**:

| Country        | Dividends (%) | Interest (%) | Royalties (%) | Notes                          |
|----------------|--------------|-------------|--------------|-------------------------------|
| USA            | 15 (5 if 10%+ shareholding) | 10 | 5 | Comprehensive treaty; FATCA also applies |
| UK             | 15           | 10          | 5            | Post-Brexit treaty still active |
| New Zealand    | 15           | 10          | 5            | Trans-Tasman relationship; CER |
| Singapore      | 15           | 10          | 10           | Important for HNW structures  |
| Japan          | 15 (10 if 10%+) | 10       | 5            |                               |
| Germany        | 15           | 10          | 10           |                               |
| Canada         | 15 (5 if 10%+) | 10        | 10           |                               |
| Hong Kong      | No formal DTA | Full domestic rates | Full domestic rates | Limited arrangement for shipping/air |
| UAE            | No DTA       | No DTA      | No DTA       | Domestic withholding rates apply |
| Cayman Islands | No DTA       | No DTA      | No DTA       | Domestic rates; no exchange of information treaty |
| BVI            | No DTA       | No DTA      | No DTA       | As above                      |

**OECD/G20 BEPS (Base Erosion and Profit Shifting)**: Australia has implemented most BEPS measures
including Country-by-Country Reporting (CbCR), hybrid mismatch rules, and the Multilateral
Instrument (MLI) which modified many of Australia's existing DTAs.

---

## 3.2 Australian Tax Residency

Whether a person is an Australian tax resident determines whether their worldwide income or
only their Australian-source income is taxable in Australia.

**Statutory Tests** (s6(1) ITAA 1936):

**1. Resides Test (Domicile)**
The primary test. A person is a resident if they "reside" in Australia — a question of fact
determined by physical presence, intention, family, business and social ties.

**2. Domicile Test**
A person whose domicile is in Australia is a resident unless their permanent place of abode
is outside Australia. "Domicile of origin" is typically where you were born/raised;
"domicile of choice" requires physical presence + settled intention to remain indefinitely.

**3. 183-Day Test**
A person present in Australia for more than 183 days during an income year is a resident
unless their usual place of abode is outside Australia and they do not intend to take up
residence in Australia.

**4. Superannuation Test**
A person is a resident if they are a member of a Commonwealth superannuation fund (applies
mainly to federal government employees and contractors posted overseas).

**Key Cases**:

*Harding v FCT [2019] FCAFC 29*: Full Federal Court considered a person who had moved to the
Middle East for work but retained strong Australian ties (family in Australia, Australian
bank accounts, Australian driver's licence). Court found him a resident. Key principle:
having a "permanent place of abode" overseas requires more than a furnished apartment —
it requires a settled, stable intention to remain there indefinitely.

*Pike v FCT [2020] FCAFC 158*: Full Federal Court case. Taxpayer lived in Thailand for years,
had a family there. Found to be a non-resident. Distinguished from Harding because the
taxpayer had objectively established a stable, continuous presence overseas.

These cases illustrate that tax residency is intensely fact-specific. The ATO does not
apply a bright-line rule. The following factors are relevant:
- Physical presence in Australia vs overseas
- Family location (spouse, children)
- Maintained accommodation in Australia (owned or rented)
- Employment and economic ties
- Membership of clubs, community organisations
- Bank accounts and financial arrangements
- Health care registration, driving licences, electoral roll

**ATO's Position (TR 2023/1)**:
The ATO issued a new tax ruling in 2023 confirming its view on the resides test and updating
its position following the Harding and Pike cases. Tributum Law can provide current guidance
on the ATO's latest position and its implications for individual circumstances.

---

## 3.3 Controlled Foreign Companies (CFCs)

**Legislation**: Part X, ITAA 1936 (s340 onwards)

**Purpose**: Prevent Australian residents from deferring Australian tax by accumulating passive
income offshore in foreign subsidiaries.

**When CFC Rules Apply**:
An entity is a CFC if it is a foreign company and Australian residents hold (or are entitled
to acquire) ≥ 50% of its interests (voting power, income entitlements, or capital).

**Attributable Income**: If a CFC earns "tainted income" (passive income such as interest,
dividends, royalties, and sales not from an active business), that income may be attributed
to the Australian resident shareholders regardless of whether it is distributed.

**Active Income Exemption**: Income from carrying on an active business (genuine commercial
activity in the foreign jurisdiction) is generally exempt from attribution.

**Key Jurisdictions for CFC Analysis**:
- CFCs in listed countries (comparable tax systems) have limited attribution
- CFCs in unlisted countries (including many zero-tax jurisdictions) have broader attribution

---

## 3.4 Transfer Pricing

**Legislation**: Subdivisions 815-B, 815-C, 815-D ITAA 1997 (modernised framework from 2013)

Australia's transfer pricing rules require that transactions between related parties in
different jurisdictions be priced as if they were conducted between arm's length parties.

**Arm's Length Principle**: The price should be what two independent parties dealing freely
in the open market would agree to.

**ATO Documentation Requirements**:
Taxpayers with international related-party dealings ≥ $2m must prepare and maintain
documentation contemporaneously. For larger groups: Local File, Master File, and Country-by-Country
Report (CbCR) requirements apply (broadly: aggregated group revenue ≥ $1 billion for CbCR).

**Common Issues**:
- Intercompany loans: interest rates must reflect arm's length borrowing conditions
- Management fees charged between group entities
- IP licensing arrangements
- Supply chain restructuring when moving functions offshore

**Penalties**: Failure to have contemporaneous documentation means the taxpayer cannot reduce
penalties for a transfer pricing adjustment. Maximum penalties of 75% of shortfall amount apply.

---

## 3.5 Common Reporting Standard (CRS)

**Legislation**: Tax Laws Amendment (Implementation of the Common Reporting Standard) Act 2016

The CRS is a global standard developed by the OECD for the automatic exchange of financial
account information between tax authorities.

**How It Works**:
- Australian financial institutions (banks, brokers, managed funds, insurance companies)
  collect information on account holders who are tax residents of participating countries
- Information is automatically shared with those countries' tax authorities
- Australia's partners include 100+ jurisdictions (essentially all OECD and G20 countries,
  most offshore financial centres, but not USA — USA operates FATCA instead)

**What Is Reported**:
- Account holder name, address, tax identification number
- Account balance/value at year end
- Gross interest, dividends, and other income credited to the account
- Gross proceeds from sales of financial assets

**Implications**:
CRS means offshore accounts are no longer confidential. Australian residents with undisclosed
foreign bank accounts or investments are at high risk of ATO detection. Voluntary disclosure
programs are available but penalties still apply.

---

## 3.6 FATCA (Foreign Account Tax Compliance Act)

FATCA is a US law (enacted 2010, effective 2014) requiring foreign financial institutions to
report information about accounts held by US persons to the US Internal Revenue Service (IRS).

**Australia–USA Intergovernmental Agreement (IGA)**: Australia signed a Model 1 IGA with the USA.
Under this, Australian financial institutions report FATCA information to the ATO, which then
forwards it to the IRS. Reciprocally, the IRS provides information to the ATO about Australian
residents with US accounts.

**US Persons**: A US person for FATCA purposes includes:
- US citizens (including those born in Australia to a US parent who may not realise they are US citizens)
- US permanent residents (Green Card holders)
- Persons who satisfy the US Substantial Presence Test

**PFIC Rules (Passive Foreign Investment Company)**:
Australian managed funds and ETFs held by US persons are typically PFICs. PFIC taxation is
punitive unless a Qualified Electing Fund (QEF) election is made (most Australian funds do not
support this). US persons investing in Australian managed funds face extremely complex US tax
treatment. Tributum Law works with US tax specialists for these matters.

**Super for US Persons**: Australian superannuation is not recognised as a tax-deferred pension
arrangement under US law. US persons in Australia with superannuation face complex US tax
treatment including possible PFIC and FBAR filing obligations.

---

## 3.7 Foreign Investment Review Board (FIRB)

**Legislation**: Foreign Acquisitions and Takeovers Act 1975 (FATA); Foreign Investment Policy

FIRB is the advisory body to the Treasurer of Australia. Foreign persons generally need FIRB
approval before acquiring interests in Australian land, businesses, or entities above monetary thresholds.

**Key Thresholds (2024–25)**:

*Residential Real Estate*:
- Foreign persons: FIRB approval required for established dwellings (generally not permitted
  except in limited circumstances such as temporary residents buying one primary residence)
- New dwellings: $0 threshold — approval required for all foreign persons

*Commercial Land*:
- General: $310m (indexed)
- "Sensitive" sectors (media, telecommunications, transport, energy, military): $0 threshold
- Free Trade Agreement (FTA) partners (USA, Singapore, Japan, South Korea, Chile, etc.): higher thresholds

*Business Acquisitions*:
- General: $310m (indexed)
- Agribusiness: $65m
- State-owned enterprises or foreign government investors: $0 threshold

**FIRB Application Fees**: Substantial fees apply based on transaction value (can be tens of thousands
of dollars for large acquisitions).

**Significant Action vs Notifiable Action**: The Act distinguishes actions that require approval
("notifiable") from those merely needing notification. Penalties for non-compliance include
divestiture orders and civil penalties.

---

## 3.8 Thin Capitalisation

**Legislation**: Division 820, ITAA 1997 (significantly reformed from 1 July 2023)

Thin capitalisation rules limit the deductibility of interest and debt costs for entities with
related-party debt where the entity is "thinly capitalised" (too much debt relative to equity).

**Who Is Affected**: Australian entities with foreign controllers, and foreign entities operating
in Australia.

**New Rules from 1 July 2023 — Three Methods**:

1. **Fixed Ratio Test** (default): Deductible debt deductions capped at 30% of "tax EBITDA"
   (earnings before interest, tax, depreciation, and amortisation — as calculated under the tax rules)

2. **Group Ratio Test**: Allows deduction up to the group's net external interest expense as a
   proportion of group EBITDA (only available to entities in a consolidated accounting group)

3. **Third-Party Debt Test**: Allows full deduction of genuine arm's length third-party debt (no
   related-party loans); replaces the old "arm's length debt test"

**Consequence of Excess**: Debt deductions exceeding the relevant cap are disallowed — effectively
increasing taxable income.

**Note**: The previous safe harbour (60% of Australian assets) was abolished for income years
starting on or after 1 July 2023. This is a significant change affecting many foreign-owned groups.


────────────────────────────────────────────────────────────────────────────────
SECTION 4 — INTERNATIONAL RELOCATION & TAX RESIDENCY
────────────────────────────────────────────────────────────────────────────────

## 4.1 Becoming an Australian Tax Resident

When a foreign person moves to Australia and becomes a tax resident, the following rules apply:

**CGT Cost Base Reset**: On the day the person becomes an Australian tax resident, pre-existing
foreign CGT assets are deemed to have been acquired at their market value on that date (s855-45).
This prevents double taxation of pre-residency gains.

**Deemed Disposal on Entry**: For certain foreign assets held in a foreign pension fund or
specific offshore structures, there may be additional entry tax considerations.

**Super Obligations**: Once an Australian resident employed in Australia, the employer must
make Superannuation Guarantee contributions.

**Temporary Residents**:
- A "temporary resident" is a person who holds a temporary visa and is not an Australian citizen
  or permanent resident, and whose spouse is also not an Australian citizen or permanent resident
- Temporary residents are only taxed on Australian-source income — not on foreign income
- CGT applies only to "taxable Australian property" (Australian real estate, business assets)
- This is a major concession and is a common basis for tax-effective structuring of short-term
  Australian residency for foreign nationals

---

## 4.2 Ceasing Australian Tax Residency

When an Australian tax resident ceases to be a resident, the CGT deemed disposal rules
under s104-160 (CGT Event I1) apply:

**CGT Event I1 (Deemed Disposal)**:
- The taxpayer is taken to have disposed of all CGT assets (other than "taxable Australian property")
  at market value on the day they cease to be a resident
- Tax is calculated on any accrued capital gains as if the assets had been sold
- This is a potentially large and unexpected tax liability for Australians with significant
  offshore share portfolios, units in managed funds, or interests in foreign structures

**Exceptions — Taxable Australian Property**:
The following are NOT subject to CGT Event I1 (they remain within the Australian CGT net
regardless of the owner's residency):
- Australian real property (real estate)
- Interests in Australian entities whose principal assets are Australian real property
- Business assets of a permanent establishment in Australia

**Election to Defer**:
Taxpayers can elect under s104-165 to defer the CGT Event I1 until the actual disposal of
the relevant asset. However, this means future gains are calculated from the original cost base
(no reset), and the taxpayer must report the eventual disposal to the ATO.

**Managed Fund Units**: Special rules apply. Many Australian managed fund units are treated as
"taxable Australian property" because the fund's principal assets are Australian land or
infrastructure. This is a technical area requiring advice.

**Practical Steps Before Departing**:
- Prepare detailed asset schedule with market values at departure date
- Assess whether to make the deferral election or crystallise gains
- Consider timing of departure relative to asset disposals
- Update ABN, TFN registrations; notify ATO of change of address and residency status
- Consider withholding tax obligations on future Australian-source income

---

## 4.3 Foreign Residents — Australian-Source Income Withholding Tax

Once a person is a non-resident, Australian-source income is subject to withholding tax
deducted at source. Rates (domestic; reduced under DTA if applicable):

| Income Type         | Domestic Rate | Notes                                        |
|---------------------|--------------|----------------------------------------------|
| Dividends (unfranked) | 30%        | Reduced to 15% under most DTAs               |
| Dividends (franked) | 0%           | Franked dividends carry franking credits; no WHT |
| Interest            | 10%          | Financial institution debt — may be nil under DTA |
| Royalties           | 30%          | May be reduced to 5–10% under DTA            |
| Rent (Australian property) | Withholding applies or annual return required | |

Non-residents are not eligible for the tax-free threshold, CGT discount (individuals — this
is currently under review; as at the knowledge date of this KB, non-residents do not get the
50% CGT discount), or most offsets.

---

## 4.4 Working Holiday Makers (WHM)

Working Holiday Makers (subclass 417 and 462 visas) are taxed at:
- 15% from the first dollar (no tax-free threshold) on income up to $45,000
- Progressive rates above $45,000
- No CGT discount

From 1 January 2017, the WHM tax rate was increased by the government; litigation followed
(Addy v FCT [2021] HCA 34) in which the High Court found the rate discriminatory under
the DTA with the UK. As a result, UK (and certain other DTA partner country) WHM residents
now use ordinary progressive rates. Advice on WHM tax should be current.

---

## 4.5 Popular Relocation Destinations

### United Arab Emirates (UAE)
- No income tax on individuals
- No capital gains tax on individuals
- No inheritance tax
- No DTA with Australia
- Substance requirements: UAE requires genuine UAE residency — you must have a UAE residence
  visa (employer-sponsored, investor/freelancer visa, or "Golden Visa") and physically spend
  meaningful time in the UAE
- UAE Free Zones: Popular for operating businesses — 9% corporate tax applies from June 2023
  (but most SME businesses under AED 375,000 profit are exempt)
- IMPORTANT: Ceasing Australian tax residency when relocating to the UAE requires meeting all
  four residency tests. The ATO scrutinises UAE relocations heavily. A person who moves to Dubai
  but maintains a home in Australia, sends their children to Australian schools, and returns
  frequently may still be found to be an Australian tax resident.
- Emirates ID, UAE bank account, and employer/business registration in the UAE strengthen residency
  claims but are not determinative

### Singapore
- Personal income tax rates: 0–22% (lower than Australia above $120k)
- Territorial tax system — foreign-sourced income generally not taxed in Singapore
- DTA with Australia in place (provides certainty on dividend/interest/royalty WHT rates)
- 183-day physical presence rule applies for Singapore residency
- Section 13O/13U family office regimes: tax incentives for qualifying family offices
- HNWI route: Global Investor Programme (GIP) for establishing Singapore permanent residency

### Cayman Islands
- No income tax, no CGT, no corporate tax
- No DTA with Australia — Australian domestic withholding rates apply to Australian-source income
- Commonly used for investment fund structures, not typically for individual residency
- OECD BEPS compliance: Cayman has enacted economic substance legislation for entities
  in prescribed "relevant activities"

### British Virgin Islands (BVI)
- No income tax, no CGT on individuals
- No DTA with Australia
- Commonly used for offshore holding companies; less common for individual residency
- CRS participating jurisdiction — financial information exchanged

### Moving Back to Australia
- Re-entry as a tax resident triggers the cost base reset (market value on re-entry date)
- If assets were depreciated or grew offshore in a low-tax jurisdiction, the reset is
  generally advantageous

---

## 4.6 Australian Expats — Ongoing Obligations

Australians living abroad who remain Australian tax residents (or who return to residency):

- **HECS/HELP Debt**: The ATO introduced worldwide income repayment obligations for HECS/HELP
  debtors living overseas from 1 July 2017. Expats must file Australian tax returns reporting
  worldwide income and make HECS/HELP repayments if income exceeds the threshold (~$54,435).
- **Medicare**: Expats who have been overseas for > 5 weeks without private health insurance
  should lodge a Medicare Levy Exemption Certificate to avoid paying the 2% Medicare Levy
  on income earned while abroad.
- **Super**: Super continues to accumulate on Australian-source employment income regardless of
  where the employee is based. Expats can access super once they permanently depart Australia
  (Departing Australia Super Payment — DASP, taxed at 35% for taxable component).
- **Annual Tax Returns**: Australian residents (including expats) must file annual tax returns
  reporting worldwide income.


────────────────────────────────────────────────────────────────────────────────
SECTION 5 — WILLS, ESTATES & SUCCESSION WITH INTERNATIONAL ASSETS
────────────────────────────────────────────────────────────────────────────────

## 5.1 State-Based Succession Law

Estate and succession law in Australia is State and Territory law — not federal law.
Each State has its own Succession Act.

| Jurisdiction | Act                                      |
|--------------|------------------------------------------|
| NSW          | Succession Act 2006 (NSW)                |
| Victoria     | Administration and Probate Act 1958 (VIC); Wills Act 1997 (VIC) |
| Queensland   | Succession Act 1981 (QLD)               |
| WA           | Wills Act 1970 (WA)                      |
| SA           | Succession Act 2023 (SA) — recent reform |
| Tasmania     | Wills Act 2008 (TAS)                     |
| ACT          | Wills Act 1968 (ACT)                     |
| NT           | Wills Act 2000 (NT)                      |

The law of the deceased's domicile at death generally governs succession to personal property.
The law of the jurisdiction where land is situated (lex situs) governs succession to real property.

---

## 5.2 Probate

Probate is the court process by which a will is proved to be valid and the executor is
authorised to administer the estate.

**Process (approximate)**:
1. Death certificate obtained
2. Will located and verified
3. Application filed in Supreme Court of the relevant State/Territory
4. Probate typically granted within 4–8 weeks of filing (can be 3–6 months total from death
   to full estate administration, depending on complexity)
5. Executor uses Grant of Probate to collect assets, pay debts, and distribute estate

**Foreign Grants of Probate**:
If a person dies overseas with Australian assets, the foreign executor must obtain a re-sealed
grant of probate from an Australian Supreme Court before dealing with Australian assets.
Alternatively, if there is an Australian will, probate can be obtained in Australia directly.

**Intestacy**:
If a person dies without a valid will (intestate), the intestacy provisions of the relevant
State Act determine who inherits. Typically: spouse and children share the estate; if no
spouse or children, it passes to parents, siblings, etc.

---

## 5.3 International Assets in an Australian Will

**Challenges**:

1. **Situs of Assets**: Each category of asset has a legal situs:
   - Real property: situs is where it is located
   - Bank accounts: situs is where the bank branch is located
   - Shares in companies: situs of a company is generally its place of incorporation
   - Debts: situs is where the debtor resides
   - Bearer instruments: where physically located

2. **Choice of Law**: A will valid in one country may not be recognised in another. The Hague
   Convention on the Law Applicable to Succession (1989) provides some harmonisation, but not
   all countries are signatories.

3. **Forced Heirship**: Many civil law jurisdictions (France, Germany, Spain, Italy, UAE,
   many Middle Eastern and Asian countries) have "forced heirship" rules reserving a minimum
   share of the estate for children and/or spouses regardless of what the will says.
   Australian law does not have forced heirship, but an Australian testator with assets in
   a forced heirship jurisdiction cannot override those rules by using an Australian will alone.

4. **Multiple Wills**: For testators with assets in multiple jurisdictions, it is often advisable
   to have separate wills for each jurisdiction (e.g. an Australian will for Australian assets,
   a UAE will for UAE real estate). Each will must be carefully drafted to avoid one revoking the other.

5. **Foreign Grants of Representation**: Executors dealing with foreign assets generally need
   a grant of representation from the courts of that country. In some countries this is a
   lengthy and expensive process.

---

## 5.4 Enduring Powers of Attorney (EPOA)

**Purpose**: Authorises a person (the "attorney") to manage the financial and/or personal affairs
of the "principal" if the principal loses capacity.

**State-Based**: Each Australian State and Territory has different EPOA legislation:
- NSW: Powers of Attorney Act 2003 (NSW)
- VIC: Powers of Attorney Act 2014 (VIC)
- QLD: Powers of Attorney Act 1998 (QLD) — combined financial and health
- WA: Guardianship and Administration Act 1990 (WA)

**International Recognition**:
An Australian EPOA is not automatically recognised in foreign jurisdictions. If a person
has overseas assets and may need someone to manage them during incapacity, a locally executed
EPOA (or equivalent document) in the foreign jurisdiction is strongly recommended.

---

## 5.5 Family Provision Claims

**What They Are**: Eligible persons (typically spouses, children, dependants) can apply to
the Supreme Court to claim a larger share of an estate if they were left with inadequate
provision for their proper maintenance, education, or advancement in life.

**Time Limits**:
- NSW: 12 months from date of death (extension possible)
- VIC: 6 months from Grant of Probate
- QLD: 9 months from date of death

**Who Can Claim**: Varies by State. Generally includes spouse/de facto partner, children
(including adult children), and in some States, former spouses and stepchildren.

**International Dimension**: Foreign beneficiaries can claim family provision in Australian
courts where the estate includes Australian assets. The Court applies Australian law.

---

## 5.6 Testamentary Trusts

A testamentary trust is a trust established by a will that only comes into existence on death.

**Advantages**:

1. **Tax Efficiency**: Minor beneficiaries (children under 18) are taxed at adult marginal rates
   on income from a testamentary trust (not the punitive minor's tax rates that apply to
   "unearned income" from ordinary discretionary trusts). This is a major tax advantage for
   estates with children.

2. **Asset Protection**: Trust assets are generally not available to the beneficiary's creditors,
   because the beneficiary does not own the assets — the trustee does. Significant benefit for
   beneficiaries in at-risk professions (doctors, lawyers, engineers) or troubled financial situations.

3. **Blended Families**: Testamentary trusts can structure a life interest for a surviving spouse
   while preserving capital for children of the first marriage.

4. **Discretion**: Trustee retains discretion on distributions — useful where beneficiaries
   may not yet be mature enough to handle a large lump sum.

**Minimum Estate Size**: Generally worthwhile for estates above ~$500,000 – $1m. Below this,
administration costs may outweigh benefits.

**Australian Tax Treatment**: Testamentary trusts are subject to special income tax rules
(s102AC ITAA 1936) that provide the minor-tax-rate advantage described above.

---

## 5.7 Superannuation Death Benefits

**Not Part of the Estate**: Superannuation does not automatically form part of a deceased person's
estate. The trustee of the super fund determines who receives the death benefit, subject to:

**Binding Death Benefit Nominations (BDBN)**:
- The member can make a BDBN directing the trustee to pay to specific dependants and/or the estate
- BDBNs are typically valid for 3 years unless the fund rules allow non-lapsing nominations
- Must be in the prescribed form; must be witnessed

**Non-Lapsing BDBNs**: Many super funds and all SMSFs allow non-lapsing BDBNs — these do not
expire every 3 years. Recommended for certainty.

**Who Can Receive Super Directly (Tax-Free)**:
- Spouse or de facto partner
- Children (but not tax-free if adult child and paid as lump sum — see below)
- Financially dependent persons
- Persons in an interdependency relationship

**Tax on Super Death Benefits**:
- Paid to a "dependant" (for tax purposes, includes spouse, minor children, financial dependants):
  tax-free
- Paid to adult children or non-dependants (via lump sum): taxed at 17% on taxable component
  (15% + Medicare levy). This is the "death tax" — minimising it is a key estate planning goal.
- Paid to estate and then to non-dependants: same 17% tax applies

**Strategies**:
- Pension phase super: convert accumulation super to a pension — income stream to surviving spouse
  is tax-free; on their death it can be commuted and distributed
- Equalise super balances between spouses to maximise use of both Transfer Balance Caps
- Consider withdrawal and re-contribution strategies before death to reduce taxable component

---

## 5.8 Jointly Held Assets

Assets held as "joint tenants" (not "tenants in common") pass automatically to the surviving
joint owner by right of survivorship — they do not form part of the deceased's estate.

**Key Points**:
- Cannot be controlled by a will — the right of survivorship is automatic
- Common for family homes (most couples hold property as joint tenants)
- Bank accounts held jointly: pass to survivor
- Shares held jointly: transfer to survivor on death

**Tenants in Common**: Each person owns a defined share (e.g. 50/50). On death, their share
forms part of the estate and passes under the will.

**Planning Consideration**: For blended families or asset protection planning, tenants in common
(rather than joint tenancy) gives each owner testamentary control over their share.

---

## 5.9 Digital Assets in Estates

An emerging and rapidly developing area. Digital assets include:
- Cryptocurrency (Bitcoin, Ethereum, etc.)
- NFTs and digital collectibles
- Online investment accounts
- Loyalty points and air miles (some may be non-transferable per terms of service)
- Domain names
- Online business accounts (Shopify, PayPal, e-commerce)
- Social media accounts

**Key Issues**:
1. **Access**: Without seed phrases, private keys, or passwords, crypto assets may be permanently
   inaccessible. A will cannot compel a blockchain to transfer assets.
2. **Situs**: Uncertain — courts are still developing the law. May be determined by domicile of
   owner or location of exchange.
3. **Valuation**: Highly volatile; valuation at date of death critical for estate/beneficiary purposes.
4. **ATO Treatment**: Crypto is a CGT asset. Death triggers CGT Event K3 (passing to non-exempt
   beneficiary). Market value at date of death becomes beneficiary's cost base.

**Best Practice**: Clients with material crypto holdings should:
- Prepare a secure "digital asset inventory" accessible to their executor
- Consider using a hardware wallet with clear succession instructions
- Ensure executor has technical knowledge or access to a specialist

---

## 5.10 Asset Protection Trusts (Offshore)

**Cook Islands Trusts**: One of the strongest asset protection trust structures available.
The Cook Islands do not recognise foreign court judgments against trust assets. Used by
HNWI clients who want protection from potential future creditors (must be established
well before any claims arise — fraudulent transfer rules apply).

**Cayman Islands Trusts / STAR Trusts**: Highly flexible trust structures. Commonly used
in family office and institutional settings. No forced heirship.

**Risks and Considerations**:
- ATO transparency: offshore trusts may still be subject to Australian tax if the settlor
  or beneficiaries are Australian residents
- CRS reporting: financial institutions in Cayman and Cook Islands now participate in CRS
  — offshore financial accounts are reported to the ATO
- Proper legal structures do not involve concealment — all legally held offshore structures
  must be disclosed to the ATO (offshore trusts, foreign companies, etc.)
- Fraudulent preference / voidable transaction rules: transfers made to protect assets from
  existing known creditors can be unwound by courts


────────────────────────────────────────────────────────────────────────────────
SECTION 6 — ASSET PROTECTION
────────────────────────────────────────────────────────────────────────────────

## 6.1 Discretionary (Family) Trusts

The discretionary trust is the primary Australian asset protection and tax planning vehicle
for family wealth.

**Structure**:
- **Settlor**: Establishes the trust (typically nominal role)
- **Trustee**: Controls the trust, holds assets, has discretion to distribute income and capital
- **Appointor (Principal)**: Has power to remove and replace the trustee — the true controlling position
- **Beneficiaries**: Those who may receive distributions (defined broadly in the deed — typically
  the family group and associated entities)

**Asset Protection Mechanism**:
- Assets held by the trust are not beneficially owned by any individual beneficiary
- Creditors of a beneficiary cannot seize trust assets (unless the beneficiary has a fixed
  entitlement, or unless they can establish the trust was established to defeat creditors)
- The trustee's personal assets are protected because a corporate trustee is used (see 6.2)

**Tax Benefits**:
- Income splitting: trustee can distribute income to lower-marginal-rate beneficiaries each year
- Capital gains streaming: stream capital gains to the beneficiary who can best utilise the
  50% CGT discount
- Minor beneficiaries: taxed at punitive rates on "unearned income" from inter vivos trusts —
  only applies to ordinary trusts (not testamentary trusts)

**Resettlement Risk**: Altering trust terms or transferring assets between trusts can trigger
CGT (CGT Event E1 — new trust created). Careful drafting and stamping required.

---

## 6.2 Corporate Trustees

Using a company as trustee of a discretionary trust is standard practice in Australia.

**Why Use a Corporate Trustee**:
1. **Continuity**: Companies don't die. An individual trustee dies and trust assets need to be
   transferred to a new trustee — triggering potential duty and CGT events.
2. **Limited Liability**: The company's liability is limited. Without limited liability, an individual
   trustee is personally liable for trust debts.
3. **Professionalism**: A dedicated trustee company keeps trust affairs separate from personal
   affairs — important for asset protection integrity.

**Common Structure**:
- Trustee: Pty Ltd company (sole trustee)
- Director and shareholder: the client (or their spouse/family members)
- The trust deed names the company as trustee

**Directorship Risk**: If the client is director of the trustee company, in certain circumstances
(particularly insolvency-related) the director can still be exposed. For serious asset protection,
consider having a non-director family member hold shares in the trustee company.

---

## 6.3 Self-Managed Superannuation Funds (SMSFs)

**Structure**: A superannuation fund with 1–6 members who are also the trustees (or directors
of a corporate trustee). Regulated by the ATO and SIS Act.

**Asset Protection**:
- Superannuation is one of the strongest asset protection vehicles in Australia
- Super assets are generally protected from bankruptcy proceedings for contributions made
  before any bankruptcy event and in good faith
- Exception: contributions made to defeat creditors can be clawed back by a trustee in bankruptcy

**SMSF Investment in Real Property — LRBAs (Limited Recourse Borrowing Arrangements)**:
- SMSFs can borrow to invest in real property (or shares) via an LRBA
- The asset is held in a separate holding trust until the loan is repaid
- "Limited recourse" means the lender's recourse is limited to the asset — other SMSF assets
  are protected if the investment fails
- ATO requires LRBAs to be on arm's length commercial terms (or the related-party rules apply)
- Residential property: cannot be acquired from a related party; members cannot live in it
- Commercial property: can be leased to a related party (member's business) at market rent —
  this is a significant planning opportunity for business owners

**Contribution Strategies**:
- The SMSF can receive deductible employer contributions (up to $30,000 concessional cap)
  and non-concessional contributions (up to $120,000 per year or bring-forward)
- Business real property contributed in-specie to an SMSF: CGT concessions may apply

---

## 6.4 Bankruptcy Act 1966 — Asset Protection Limits

**Relation-Back Period**: Transactions made before bankruptcy can be unwound by a trustee
in bankruptcy (the "relation-back period"):
- **2 years** before the "relation-back day" for transactions with non-associates
- **10 years** before the relation-back day for transactions with associates (spouse, relatives,
  companies where the bankrupt is a director or has substantial influence)

**Section 120 (Transfer at Undervalue to Associate)**:
A transfer of property to a spouse or other associate at undervalue (less than full market value)
within 4 years before bankruptcy is voidable.

**Section 121 (Transfer to Defeat Creditors)**:
A transfer of property is void against a trustee in bankruptcy if:
- The main purpose was to prevent the property being available to creditors, or
- Made in contemplation of an impending act of bankruptcy

This is the primary mechanism used to challenge asset protection structures established
at the last minute.

**Key Principle**: Asset protection structures must be established BEFORE any problems arise.
A trust established after a person becomes aware of a significant claim is vulnerable.

---

## 6.5 Personal Property Securities Register (PPSR)

**Legislation**: Personal Property Securities Act 2009 (Cth)

The PPSR is a national online register of security interests in personal property
(everything except land).

**Common Uses**:
- Registering a security interest in equipment, inventory, receivables
- Retention of title clauses in supply contracts
- Vehicle purchase — checking if a vehicle has finance owing

**If Not Registered**: A security interest that is not registered on the PPSR is unperfected.
In insolvency, an unperfected security interest is lost — the asset vests in the liquidator.

**Relevance to Asset Protection**: Clients with valuable personal property (equipment, vehicles,
IP) should ensure their security interests are properly registered on the PPSR.

---

## 6.6 Family Office Structures

For high-net-worth individuals and families (typically $10m+ in assets), a formal family
office structure provides governance, tax efficiency, and succession planning.

**Common Structure**:
- **Holding Company**: A Pty Ltd holding company (or multiple) owned by a discretionary trust
- **Operating Companies**: Subsidiaries for active business operations
- **Investment Entities**: Separate entities for investment portfolios, property, and liquid assets
- **Super Fund**: SMSF with significant assets
- **Trusts**: Multiple discretionary trusts for different family groups/generations

**Singapore Family Office**:
Singapore's Section 13O and 13U fund management incentive programs provide tax exemptions
on qualifying investment income for family offices managing assets in Singapore.
Requirements include minimum AUM (S$10m for 13O; S$50m for 13U), minimum local investment
conditions, and employment of local investment professionals.

**Key Benefits of a Structured Family Office**:
- Clear governance and decision-making
- Succession planning across generations
- Tax efficiency across multiple entities
- Consolidated investment management
- Protection from family disputes

**Professional Advice**: Establishing and maintaining a family office structure requires
ongoing legal, accounting, and investment advice. Tributum Law specialises in the legal
architecture of these structures.


────────────────────────────────────────────────────────────────────────────────
SECTION 7 — LEAD QUALIFICATION SIGNALS
────────────────────────────────────────────────────────────────────────────────

The following enquiry types represent high-value matters. Lex should recognise these signals
and prioritise routing to a Tributum consultation.

**Priority-1 (Route Immediately to Consultation)**:
- International relocation: individual moving to or from Australia (especially UAE, Singapore, USA, UK)
  — involves residency analysis, CGT Event I1, and potentially FATCA/PFIC
- Business sale or exit: CGT, small business concessions, Division 7A clean-up, trust distribution
- Cross-border estate planning: will with assets in multiple jurisdictions, foreign forced heirship
- Offshore account compliance: undisclosed foreign accounts, CRS/FATCA exposure, voluntary disclosure
- Foreign investment into Australia: FIRB approval, structuring for foreign purchaser
- Estate for a deceased with foreign assets: international probate, foreign asset repatriation

**Priority-2 (Engage Deeply, Then Route)**:
- Trust restructuring or dispute: s100A risk, deed variation, resettlement
- SMSF setup with LRBA or commercial property: compliance-heavy structure
- High-income earner (> $500k) seeking tax structuring: Division 293, trust distributions, salary packaging
- Business owner wanting asset protection review: separation of risk and wealth
- Cross-border employment: dual residency, foreign employment income, expat packages
- HNW estate planning (estate > $3m): testamentary trusts, super death benefit planning, family provision

**Priority-3 (Inform and Capture Contact)**:
- General tax questions from small business owners
- First-time trust establishment
- Simple estate planning (single jurisdiction, modest estate)
- General super questions

**Qualifying Questions Lex Should Ask**:
1. "Are any of your assets, income sources, or family members outside Australia?"
2. "Are you planning to move countries, or have you recently done so?"
3. "Is this related to a business sale, trust, or significant estate?"
4. "What is the approximate value of the assets involved?"
5. "Which state or territory are you based in?"


────────────────────────────────────────────────────────────────────────────────
SECTION 8 — DISCLAIMER FRAMEWORK
────────────────────────────────────────────────────────────────────────────────

Lex operates under a clear disclaimer framework. Key principles:

**What Lex Does**:
- Provides general legal information about Australian and international tax law
- Explains how the law works in general terms
- Identifies relevant legislation and principles
- Helps users understand their situation and the key issues involved
- Routes users toward qualified legal advice for their specific circumstances

**What Lex Does Not Do**:
- Provide legal advice (advice tailored to specific facts that a person can act upon)
- Predict outcomes in a specific matter
- Quote specific tax liabilities without review of full facts
- Make up legislation, cases, or rulings
- Provide advice on matters outside this knowledge base (e.g. criminal law, family law,
  routine property conveyancing)

**Standard Framing (apply naturally, not robotically)**:

Use language such as:
- "As general information, here's how this works..."
- "In broad terms, the rule is X — though the specific application to your situation
  would depend on the exact facts."
- "This is a complex area where the details matter a great deal. A confidential consultation
  with Tributum Law would allow us to review your specific circumstances."
- "I can explain the general framework, but I want to be clear this isn't legal advice —
  the right answer for you depends on facts I don't have."
- "That's exactly the kind of situation where Tributum Law can add real value — the
  interplay of [X and Y rules] requires careful analysis of your specific structure."

**Routing Language**:
- "This is the kind of matter where I'd encourage you to book a consultation —
  it's too important to leave to general information."
- "You can reach Tributum Law at hello@tributumlaw.com or book directly at
  https://tributumlaw.com/contact-us"
- "Would it help if I connected you with Tributum Law directly? A confidential
  consultation would give you certainty on this."

**Scope Limits**:
If asked about something outside the knowledge base (e.g. US domestic tax, UK tax, family law,
immigration law), say so clearly: "That's outside my area — I can speak to Australian and
international tax law, but for [X], you'd need a specialist in that area."

================================================================================
END OF LEX KNOWLEDGE BASE
================================================================================
`;
