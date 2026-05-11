/**
 * PII Scanner & Tokenizer for Lex
 *
 * Scans legal text for client-identifying information and replaces it with
 * anonymized tokens before sending to an LLM API. Rehydrates on return.
 *
 * Detection tiers:
 *   - HIGH: structured identifiers (email, phone, ABN, ACN, TFN, URLs)
 *   - MEDIUM: entity names (Trusts, Pty Ltd companies, etc.)
 *   - LOW:  person names with titles or party references
 */

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
const COMMON_WORDS = new Set([
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

  // 2. Australian phone numbers (various formats)
  // +61 4XX XXX XXX, +61 X XXXX XXXX, 04XX XXX XXX, (0X) XXXX XXXX, 0X XXXX XXXX
  result = result.replace(
    /(?:\+61[\s\-]?|0)[\s\-]?(?:4\d{2}[\s\-]?\d{3}[\s\-]?\d{3}|\d[\s\-]?\d{4}[\s\-]?\d{4}|\d{4}[\s\-]?\d{3}[\s\-]?\d{3}|\d{2}[\s\-]?\d{4}[\s\-]?\d{4})/g,
    (match) => {
      // Validate length is reasonable (10-15 chars with formatting)
      if (match.length < 8 || match.length > 20) return match;
      const digitsOnly = match.replace(/\D/g, "");
      if (digitsOnly.length < 8 || digitsOnly.length > 15) return match;
      const t = getToken("PHONE");
      tokenMap[t] = match;
      return t;
    }
  );

  // 3. ABN (11 digits, with optional spaces)
  result = result.replace(
    /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g,
    (match) => {
      const digits = match.replace(/\s/g, "");
      if (digits.length !== 11) return match;
      const t = getToken("ABN");
      tokenMap[t] = match;
      return t;
    }
  );

  // 4. ACN (9 digits, with optional spaces) — but NOT if it's part of an ABN
  // Since ABNs are already tokenized, we just match 9-digit sequences now.
  result = result.replace(
    /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
    (match) => {
      const digits = match.replace(/\s/g, "");
      if (digits.length !== 9) return match;
      const t = getToken("ACN");
      tokenMap[t] = match;
      return t;
    }
  );

  // 5. TFN / other 8-9 digit identifiers (only if not already matched as ACN)
  // Skip for now — ACN pattern covers 9 digits. 8-digit sequences are ambiguous.

  // 6. URLs with query parameters (might contain identifiers)
  result = result.replace(
    /https?:\/\/[^\s<>\"]+/g,
    (match) => {
      const t = getToken("URL");
      tokenMap[t] = match;
      return t;
    }
  );

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
  const partyPattern = new RegExp(
    "\\b(?:" + PARTY_ROLES.join("|") + ")\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,2})\\b",
    "gi"
  );
  result = result.replace(partyPattern, (match) => {
    if (match.startsWith("{{")) return match;
    const t = getToken("PARTY");
    tokenMap[t] = match;
    return t;
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
