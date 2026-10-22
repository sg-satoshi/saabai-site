/**
 * PII Scanner & Tokenizer for Lex
 *
 * Scans legal text for client-identifying information and replaces it with
 * anonymized tokens before sending to an LLM API. Rehydrates on return.
 *
 * Detection tiers:
 *   - HIGH: structured identifiers (email, URL, ABN, ACN, TFN, Medicare, BSB and account, phone,
 *           ID for labelled numbers that fail a checksum, ADDRESS, POSTCODE)
 *   - MEDIUM: entity names (Trusts, Pty Ltd companies, etc.)
 *   - LOW:  person names with titles or party references
 */

import { isAuPhone, isValidABN, isValidACN, isValidMedicare, isValidTFN } from "./lex-privacy/au-ids";

export interface TokenMap {
  [token: string]: string;
}

export interface ScanResult {
  tokenized: string;
  tokenMap: TokenMap;
  stats: {
    tokensReplaced: number;
    types: Record<string, number>;
  };
}

// Common English words to ignore when scanning bare capitalized words
export const COMMON_WORDS = new Set([
  "The","A","An","In","On","At","To","For","Of","With","By","From","As","Is","Was","Are","Were","Be","Been","Being","Have","Has","Had","Do","Does","Did","Will","Would","Could","Should","May","Might","Must","Shall","Can","Need","Dare","Ought","Used","It","Its","This","That","These","Those","I","Me","My","Myself","We","Us","Our","Ours","Ourselves","You","Your","Yours","Yourself","Yourselves","He","Him","His","Himself","She","Her","Hers","Herself","They","Them","Their","Theirs","Themselves","What","Which","Who","Whom","Whose","When","Where","Why","How","All","Each","Every","Both","Few","More","Most","Other","Some","Such","No","Nor","Not","Only","Own","Same","So","Than","Too","Very","Just","Now","Then","Here","There","Up","Down","Out","Off","Over","Under","Again","Further","Once","During","Before","After","Above","Below","Between","Through","While","If","Because","Until","Although","Though","Unless","Since","Although","Whether","However","Therefore","Thus","Moreover","Furthermore","Nevertheless","Nonetheless","Otherwise","Instead","Meanwhile","Besides","Also","Too","Either","Neither","Both","Section","Act","Part","Division","Subdivision","Chapter","Schedule","Clause","Item","Regulation","Rule","Order"," pursuant"," pursuant to"," accordance"," accordance with"," subject"," subject to"," notwithstanding"," notwithstanding"," herein"," hereof"," hereby"," hereunder"," thereof"," therein"," thereto"," therein"," aforesaid"," aforementioned"," afore-mentioned"," abovementioned"," above-mentioned"," notwithstanding"," hereinafter"," heretofore"," herebefore"," hereafter"," thenceforth"," thenceforward"," wherefore"," whereat"," whereto"," whereon"," whereupon"," whereby"," wherein"," whereof"," wherewith"," thereto"," therefrom"," thereon"," thereupon"," therewith"," theretofore"," thereinafter"," thereabout"," thereabouts"," thence"," thenceforth"," thenceforward"," hitherto"," herewith"," hereinbefore"," hereinafter"," notwithstanding"," aforesaid"," aforementioned"," afore-mentioned"," abovementioned"," above-mentioned",
  // Legal abbreviations
  "HCA","FCA","FCAFC","NSWSC","VSC","QSC","WASC","SASC","TASSC","ACTSC","NTSC","NSWCA","VSCA","QCA","WASCA","SASCA","TASCA","ACTCA","NTCA","AAT","VCAT","NCAT","QCAT","SAT","FCC","FamCA","FCWA",
  "Pty","Ltd","Inc","LLC","LP","NL","NoLiability","Limited","Corporation","Corp","Group","Holdings","Trust","Trustee","Executor","Administrator","Guardian","Receiver","Manager","Liquidator",
  // Days/months
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July","August","September","October","November","December","Jan","Feb","Mar","Apr","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  // Australian states
  "NSW","VIC","QLD","WA","SA","TAS","ACT","NT","New South Wales","Victoria","Queensland","Western Australia","South Australia","Tasmania","Australian Capital Territory","Northern Territory",
  // Courts and bodies
  "High Court","Federal Court","Supreme Court","Family Court","Federal Circuit Court","District Court","County Court","Magistrates Court","Local Court","Court of Appeal","Full Court","Privy Council","House of Lords","Supreme Court of the United Kingdom",
  // Common legal terms (capitalized in titles)
  "Court","Judge","Justice","J","CJ","Chief Justice","President","Registrar","Clerk","Magistrate","Coroner","Tribunal","Commission","Commissioner","Director","Secretary","Minister","Parliament","Government","Commonwealth","State","Territory",
  "Attorney-General","Solicitor-General","Crown","Prosecutor","Defendant","Plaintiff","Applicant","Respondent","Appellant","Cross-Appellant","Intervener","Amicus Curiae","Friend of the Court","Party","Parties","Witness","Expert","Counsel","Barrister","Solicitor","Lawyer","Practitioner",
  "Legislation","Statute","Act","Regulation","Ordinance","By-law","Rule","Order","Direction","Guideline","Policy","Procedure","Protocol","Code","Charter","Convention","Treaty","Agreement","Deed","Instrument","Document","Record","File","Matter","Proceeding","Action","Claim","Application","Motion","Summons","Subpoena","Affidavit","Statutory Declaration","Exhibit","Annexure","Schedule","Attachment","Appendix",
  // Months and numbers as words
  "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety","Hundred","Thousand","Million","Billion","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth",
]);

// Titles that indicate a person name follows
const TITLES = [
  "Mr","Mrs","Ms","Miss","Dr","Prof","Professor","Hon","Honourable","Justice","J","Sir","Lady","Lord","Dame","Madam","Madame","Monsieur","Mx",
  "Judge","Magistrate","Coroner","Commissioner","Director","Secretary","Minister","Premier","Governor","President","Chairman","Chairwoman","Chairperson","CEO","CFO","COO","CTO","CMO","CIO","CSO","Managing Director","General Manager","Partner","Senior Partner","Junior Partner","Associate","Senior Associate","Lawyer","Solicitor","Barrister","Counsel","QC","SC","KC","JP",
];

// Party role words that indicate a name follows
const PARTY_ROLES = [
  "client","applicant","respondent","plaintiff","defendant","appellant","cross-appellant","intervener","witness","expert","deponent","aggrieved","complainant","accused","offender","victim","beneficiary","settlor","donor","donee","transferor","transferee","assignor","assignee","lessor","lessee","mortgagor","mortgagee","chargor","chargee","pledgor","pledgee","guarantor","surety","principal","agent","trustee","executor","administrator","guardian","receiver","liquidator",
];

// Entity suffixes
const ENTITY_SUFFIXES = [
  "Pty Ltd","Proprietary Limited","Limited","Ltd","Inc","Incorporated","Corp","Corporation","LLC","LP","NL","No Liability","Group","Holdings","Holdings Limited","Investments","Investment Trust","Unit Trust","Family Trust","Discretionary Trust","Testamentary Trust","Charitable Trust","Trading Trust","Superannuation Fund","Super Fund","SMSFF","Foundation","Association","Society","Institute","Council","Committee","Board","Chamber","Union","Alliance","Cooperative","Co-op","Partnership","Firm","Practice",
];

/**
 * Tokenize PII in text. Returns tokenized text and a map for rehydration.
 */
export function tokenizePII(text: string, opts?: { aggressive?: boolean }): ScanResult {
  const tokenMap: TokenMap = {};
  const counters: Record<string, number> = {};
  let totalTokens = 0;

  const getToken = (type: string): string => {
    counters[type] = (counters[type] ?? 0) + 1;
    totalTokens++;
    return `{{${type}_${counters[type]}}}`;
  };
  const tok = (type: string, value: string): string => {
    const t = getToken(type);
    tokenMap[t] = value;
    return t;
  };

  // We'll make multiple passes, but need to protect already-tokenized parts.
  // Strategy: replace with tokens that contain no regex-special characters,
  // then at the end we have the tokenMap.

  let result = text;

  // ── HIGH CONFIDENCE: Structured identifiers ──

  // 1. Email addresses
  result = result.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    (match) => {
      const t = getToken("EMAIL");
      tokenMap[t] = match;
      return t;
    }
  );

  // 2. URLs (before numbers, so digits inside a URL are not split out)
  result = result.replace(/https?:\/\/[^\s<>\"]+/g, (match) => tok("URL", match));

  // 3. Australian identifiers. Unlabelled numbers are masked only when their checksum is valid
  //    (cuts false positives on case numbers, amounts and references). A number labelled as an
  //    identifier is always masked: if its checksum fails (likely a typo) it becomes a generic ID.
  result = maskAuIdentifiers(result, tok);

  // 4. Street addresses, PO boxes and "Suburb QLD 4218" localities.
  result = maskAddresses(result, tok);

  // 7. Dollar amounts with specific contexts that could identify matters
  // Only in aggressive mode
  if (opts?.aggressive) {
    result = result.replace(
      /\$[\d,]+(?:\.\d{2})?\s*(?:million|m|billion|b|k)?/gi,
      (match) => {
        const t = getToken("AMOUNT");
        tokenMap[t] = match;
        return t;
      }
    );
  }

  // ── MEDIUM CONFIDENCE: Entity names ──

  // 8. Trust names: "The ... Trust", "... Family Trust", etc.
  // Also captures "Smith Family Discretionary Trust"
  const trustPattern = new RegExp(
    "\\b(?:The\\s+)?([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,4}\\s+(?:Family\\s+)?(?:Discretionary\\s+|Unit\\s+|Testamentary\\s+|Charitable\\s+|Trading\\s+)?Trust)\\b",
    "g"
  );
  result = result.replace(trustPattern, (match) => {
    // Don't double-tokenize
    if (match.startsWith("{{")) return match;
    const t = getToken("TRUST");
    tokenMap[t] = match;
    return t;
  });

  // 9. Company names ending in known suffixes
  const companyPattern = new RegExp(
    "\\b([A-Z][a-zA-Z0-9&]+(?:\\s+[A-Z][a-zA-Z0-9&]+){0,5}\\s+(?:" +
      ENTITY_SUFFIXES.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
      "))\\b",
    "g"
  );
  result = result.replace(companyPattern, (match) => {
    if (match.startsWith("{{")) return match;
    const t = getToken("COMPANY");
    tokenMap[t] = match;
    return t;
  });

  // 10. "Trustee of the ..." pattern
  result = result.replace(
    /\b(Trustee\s+of\s+(?:the\s+)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\b/g,
    (match) => {
      if (match.startsWith("{{")) return match;
      const t = getToken("TRUSTEE");
      tokenMap[t] = match;
      return t;
    }
  );

  // ── LOW CONFIDENCE: Person names ──

  // 11. Titled names: "Mr John Smith", "Dr Jane Doe", etc.
  const titlePattern = new RegExp(
    "\\b(?:" + TITLES.join("|") + ")\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,2})\\b",
    "g"
  );
  result = result.replace(titlePattern, (match, nameGroup) => {
    if (match.startsWith("{{")) return match;
    const t = getToken("PERSON");
    tokenMap[t] = match;
    return t;
  });

  // 12. Party references: "client John Smith", "applicant ABC Pty Ltd" (already tokenized companies, so mainly people here)
  // The role word is case-insensitive but the name must be Capitalised. (A "gi" flag here used to make
  // [A-Z] match lowercase too, so "client is and their" became a PARTY token and the model echoed it in
  // place of the real name.) Only the name is masked; the role word stays readable.
  const roleAlt = PARTY_ROLES.map((r) => `[${r[0].toUpperCase()}${r[0]}]${r.slice(1)}`).join("|");
  const partyPattern = new RegExp(
    "\\b((?:" + roleAlt + ")\\s+)([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,2})\\b",
    "g"
  );
  result = result.replace(partyPattern, (match, role: string, name: string) => {
    if (match.startsWith("{{")) return match;
    const t = getToken("PARTY");
    tokenMap[t] = name;
    return role + t;
  });

  // 13. Aggressive mode: bare capitalized name sequences (2-3 words)
  if (opts?.aggressive) {
    result = result.replace(
      /\b([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)(?:\s+([A-Z][a-zA-Z]+))?\b/g,
      (match, w1, w2, w3) => {
        if (match.startsWith("{{")) return match;
        // Skip if any word is common
        const words = [w1, w2, w3].filter(Boolean);
        if (words.some((w) => COMMON_WORDS.has(w))) return match;
        // Skip if it looks like a case citation (contains v or vs)
        if (/\bv\b|\bvs\b|\bversus\b/i.test(match)) return match;
        // Skip if next word suggests it's not a name (e.g., "Act", "Section")
        // We can't easily look ahead in replace, so just accept some false positives
        const t = getToken("PERSON");
        tokenMap[t] = match;
        return t;
      }
    );
  }

  return {
    tokenized: result,
    tokenMap,
    stats: {
      tokensReplaced: totalTokens,
      types: counters,
    },
  };
}

/**
 * Rehydrate tokens back to original values.
 */
export function rehydrateTokens(tokenizedText: string, tokenMap: TokenMap): string {
  let result = tokenizedText;
  // Sort tokens by length descending so longer tokens don't interfere with shorter ones
  const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    // Use a global replace for this specific token
    result = result.split(token).join(tokenMap[token]);
  }
  return result;
}

/**
 * Scan text and return all PII found (without tokenizing).
 * Useful for warnings or audits.
 */
export function detectPII(text: string): Array<{ type: string; value: string; index: number }> {
  const found: Array<{ type: string; value: string; index: number }> = [];

  // Email
  let m: RegExpExecArray | null;
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = emailRe.exec(text)) !== null) {
    found.push({ type: "EMAIL", value: m[0], index: m.index });
  }

  // Phone
  const phoneRe = /(?:\+61[\s\-]?|0)[\s\-]?(?:4\d{2}[\s\-]?\d{3}[\s\-]?\d{3}|\d[\s\-]?\d{4}[\s\-]?\d{4}|\d{4}[\s\-]?\d{3}[\s\-]?\d{3}|\d{2}[\s\-]?\d{4}[\s\-]?\d{4})/g;
  while ((m = phoneRe.exec(text)) !== null) {
    const digitsOnly = m[0].replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      found.push({ type: "PHONE", value: m[0], index: m.index });
    }
  }

  // ABN
  const abnRe = /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g;
  while ((m = abnRe.exec(text)) !== null) {
    if (m[0].replace(/\s/g, "").length === 11) {
      found.push({ type: "ABN", value: m[0], index: m.index });
    }
  }

  // ACN
  const acnRe = /\b\d{3}\s?\d{3}\s?\d{3}\b/g;
  while ((m = acnRe.exec(text)) !== null) {
    if (m[0].replace(/\s/g, "").length === 9) {
      found.push({ type: "ACN", value: m[0], index: m.index });
    }
  }

  return found.sort((a, b) => a.index - b.index);
}


// ── Australian identifiers (Phase 3) ─────────────────────────────────────────

type Tok = (type: string, value: string) => string;

/** Words that label the number right after them as an identifier. */
const ID_LABEL = /(?:\bABN|\bA\.B\.N\.?|\bACN|\bARBN|\bTFN|\btax file(?: number| no\.?)?|\bmedicare(?: card)?(?: number| no\.?)?|\baccount(?: number| no\.?)?|\bacct\.?(?: no\.?)?|\ba\/c|\bBSB|\bcustomer(?: number| no\.?)?|\bmember(?: number| no\.?)?|\bpolicy(?: number| no\.?)?|\bclaim(?: number| no\.?)?|\blicen[cs]e(?: number| no\.?)?|\bpassport(?: number| no\.?)?|\bcard(?: number| no\.?)?|\bCRN|\bID|\bphone|\bph|\btel|\bmobile|\bmob|\bcall)[\s:#.]*(?:is\s+)?$/i;
const TFN_LABEL = /(?:\bTFN|\btax file(?: number| no\.?)?)[\s:#.]*(?:is\s+)?$/i;
const ACN_LABEL = /(?:\bACN|\bARBN)[\s:#.]*(?:is\s+)?$/i;
const MEDICARE_LABEL = /\bmedicare(?: card)?(?: number| no\.?)?[\s:#.]*(?:is\s+)?$/i;
const PHONE_LABEL = /(?:\bphone|\bph|\btel|\bmobile|\bmob|\bcall)[\s:#.]*(?:on\s+|is\s+)?$/i;

const before = (s: string, offset: number) => s.slice(Math.max(0, offset - 28), offset);
const inToken = (s: string, offset: number) => /\{\{[A-Z]*_?\d*$/.test(s.slice(Math.max(0, offset - 30), offset));

export function maskAuIdentifiers(text: string, tok: Tok): string {
  let r = text;

  // BSB, optionally followed by an account number.
  r = r.replace(/\bBSB\b[\s:#.]*(?:is\s+)?(\d{3}[\s-]?\d{3})\b(?:([,;]?\s*(?:and\s+)?(?:(?:acc(?:oun)?t|acct|a\/c)\.?\s*(?:number|no\.?|#)?[\s:#.]*)?)(\d{6,10})\b)?/gi,
    (m, bsb: string, mid: string | undefined, acct: string | undefined) =>
      m.slice(0, m.indexOf(bsb)) + tok("BSB", bsb) + (acct ? (mid ?? "") + tok("ACCOUNT", acct) : ""));
  // Labelled account numbers.
  r = r.replace(/\b((?:bank\s+)?(?:acc(?:oun)?t|acct|a\/c)\.?\s*(?:number|no\.?|#)?[\s:#.]*(?:is\s+)?)(\d[\d\s-]{4,14}\d)\b/gi,
    (m, label: string, num: string) => (num.replace(/\D/g, "").length >= 6 ? label + tok("ACCOUNT", num) : m));

  // Phones with +61.
  r = r.replace(/\+61[\s-]?\(?0?\)?[\s-]?\d(?:[\s-]?\d){7,8}(?!\d)/g, (m) => (isAuPhone(m) ? tok("PHONE", m) : m));

  // 11 digit shapes: ABN.
  r = r.replace(/(?<![\d{])\d{2}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}(?![\d}])/g, (m, offset: number, s: string) => {
    if (inToken(s, offset)) return m;
    if (isValidABN(m)) return tok("ABN", m);
    if (isValidMedicare(m)) return tok("MEDICARE", m);
    return ID_LABEL.test(before(s, offset)) ? tok("ID", m) : m;
  });

  // Medicare shapes: 2123 45670 1 (and the IRN).
  r = r.replace(/(?<![\d{])[2-6]\d{3}[\s-]?\d{5}[\s-]?\d(?:[\s-]?[1-9])?(?![\d}])/g, (m, offset: number, s: string) => {
    if (inToken(s, offset)) return m;
    if (isValidMedicare(m)) return tok("MEDICARE", m);
    return MEDICARE_LABEL.test(before(s, offset)) ? tok("ID", m) : m;
  });

  // Domestic phones: (07) 5555 1234, 07 5555 1234, 0412 345 678, 1300 123 456, labelled 13 12 34.
  r = r.replace(/(?<![\d{])(?:\(0[2378]\)|0[2-478])[\s-]?\d(?:[\s-]?\d){7}(?![\d}])|(?<![\d{])1[38]00[\s-]?\d{3}[\s-]?\d{3}(?![\d}])|(?<![\d{])13[\s-]?\d{2}[\s-]?\d{2}(?![\d}])/g, (m, offset: number, s: string) => {
    if (inToken(s, offset)) return m;
    const d = m.replace(/\D/g, "");
    if (d.length === 6 && !PHONE_LABEL.test(before(s, offset))) return m;
    if (isAuPhone(m)) return tok("PHONE", m);
    return PHONE_LABEL.test(before(s, offset)) ? tok("ID", m) : m;
  });

  // 8 and 9 digit shapes: ACN or TFN.
  r = r.replace(/(?<![\d{])\d{3}[\s-]?\d{3}[\s-]?\d{2,3}(?![\d}])/g, (m, offset: number, s: string) => {
    if (inToken(s, offset)) return m;
    const ctx = before(s, offset);
    const n = m.replace(/\D/g, "").length;
    if (TFN_LABEL.test(ctx)) return tok(isValidTFN(m) ? "TFN" : "ID", m);
    if (ACN_LABEL.test(ctx)) return tok(n === 9 && isValidACN(m) ? "ACN" : "ID", m);
    if (n === 9 && isValidACN(m)) return tok("ACN", m);
    if (isValidTFN(m)) return tok("TFN", m);
    return ID_LABEL.test(ctx) ? tok("ID", m) : m;
  });

  // Any other labelled identifier (licence, passport, member, policy, claim numbers).
  r = r.replace(/\b((?:customer|member|policy|claim|licen[cs]e|passport|card|CRN)\s*(?:number|no\.?|#)?[\s:#.]*(?:is\s+)?)([A-Z]{0,3}\d[\dA-Z\s-]{3,16}\d)\b/gi,
    (m, label: string, num: string) => (num.replace(/\D/g, "").length >= 5 ? label + tok("ID", num) : m));

  return r;
}

// ── Addresses (Phase 3) ──────────────────────────────────────────────────────

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Parade|Pde|Lane|Ln|Way|Terrace|Tce|Boulevard|Boulevarde|Blvd|Bvd|Highway|Hwy|Close|Cl|Circuit|Cct|Esplanade|Esp|Grove|Gr|Square|Sq|Promenade|Row|Walk|Rise|Mews|Track|Trail|Loop|Link|Quay|Vista|Glen|Gardens|Gdns";
const STATES = "QLD|NSW|VIC|WA|SA|TAS|ACT|NT|Qld|Vic|Tas";
const NAME_WORD = "[A-Z][a-zA-Z']+";
const LOCALITY = `(?:,?\\s+(?:${NAME_WORD}\\s+){0,3}(?:${STATES})\\s+\\d{4})?`;

export function maskAddresses(text: string, tok: Tok): string {
  let r = text;
  const street = new RegExp(
    `\\b(?:(?:Unit|Apartment|Apt|Suite|Shop|Level|Lvl|Lot)\\s+\\d+[A-Za-z]?\\s*[,/]?\\s*)?\\d{1,5}[A-Za-z]?(?:\\s*[/-]\\s*\\d{1,5}[A-Za-z]?)?\\s+(?:${NAME_WORD}\\s+){1,3}(?:${STREET_TYPES})\\b\\.?${LOCALITY}`,
    "g",
  );
  r = r.replace(street, (m) => tok("ADDRESS", m));
  r = r.replace(new RegExp(`\\b(?:P\\.?\\s?O\\.?|GPO)\\s*Box\\s+\\d{1,6}${LOCALITY}|\\bLocked\\s+Bag\\s+\\d{1,6}${LOCALITY}`, "gi"), (m) => tok("ADDRESS", m));
  // Locality on its own: "Merrimac QLD 4226".
  r = r.replace(new RegExp(`\\b(?:${NAME_WORD}\\s+){1,3}(?:${STATES})\\s+\\d{4}\\b`, "g"), (m) => tok("ADDRESS", m));
  // State and postcode on their own: "QLD 4226".
  r = r.replace(new RegExp(`\\b(?:${STATES})\\s+\\d{4}\\b`, "g"), (m, offset: number, s: string) => (inToken(s, offset) ? m : tok("POSTCODE", m)));
  return r;
}
