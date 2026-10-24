/**
 * Matter parties: names, business names and aliases entered on a matter are always masked,
 * with their common variants, under one placeholder per party.
 *
 * Variants for a person "John Andrew Smith": the full name, "John Smith", "J Smith", "J. A. Smith",
 * "JA Smith", "Smith, John", "Mr Smith", and "Smith" alone unless the surname is an ordinary word
 * (Will, Rose, Long...). Possessives ("Smith's") match because only the name is replaced.
 * For a business "Acme Widgets Pty Ltd": the full name, "Acme Widgets" with any or no suffix.
 *
 * Case rule (avoids the earlier over-matching bug): names of two or more words, and distinctive
 * single words (a surname like "Quokkafield"), match in any case. A single word that is also an
 * ordinary English word (Rose, Will, Long) only matches as Title Case or UPPER CASE with a first
 * name or title, never alone and never in lower case, so "rose" or "a long walk" is never masked.
 */
import { COMMON_WORDS } from "../pii-scanner";

export type PartyKind = "person" | "org" | "place";
export type MatterParty = { name: string; kind?: PartyKind; aliases?: string[] };
export type PartyMatcher = { type: "PERSON" | "COMPANY" | "PLACE"; canonical: string; anyCase: RegExp | null; exactCase: RegExp | null; source: string };

/** Ordinary words that are also surnames or short business names. Alone, they are not masked. */
const ORDINARY = new Set([
  "Will", "May", "Long", "Young", "Rose", "Hope", "Grant", "Mark", "Bill", "Joy", "Faith", "Page", "Law", "Trust", "Court", "House",
  "Rule", "Order", "Case", "Bond", "Judge", "Duke", "King", "Major", "General", "Child", "Best", "Love", "Rich", "Little", "Short",
  "Strong", "Day", "West", "North", "South", "East", "Field", "Hall", "Lane", "Street", "Hill", "Wood", "Stone", "Price", "Cash",
  "Banks", "Chase", "Read", "Cook", "Baker", "Fisher", "Hunter", "Walker", "Turner", "Parker", "Miller", "Smart", "Sharp", "Noble",
  "Bishop", "Bell", "Moss", "Frost", "Snow", "Winter", "Summer", "Fox", "Bird", "Green", "White", "Black", "Brown", "Gray", "Grey",
  "Sterling", "Victoria", "Sydney", "Mason", "Carter", "Porter", "Butler", "Archer", "Knight", "Ward", "Lord", "Golden", "Power",
  "Gold", "Silver", "Cross", "English", "French", "Glass", "Hart", "Holiday", "Joyce", "Just", "Lee", "Low", "Mann", "Martin",
  "New", "Over", "Park", "Rice", "Ryder", "Sage", "Saint", "Sales", "Service", "Small", "Steel", "Swift", "Tower", "Trade", "True",
]);
const isOrdinary = (w: string) => w.length < 3 || ORDINARY.has(cap(w)) || COMMON_WORDS.has(cap(w)) || COMMON_WORDS.has(w);
const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);

const ORG_SUFFIX = /\s*,?\s*(?:Pty\.?\s*Ltd\.?|Proprietary\s+Limited|Pty\.?\s*Limited|Limited|Ltd\.?|Inc\.?|Incorporated|Corp\.?|Corporation|LLC|L\.L\.C\.|NL|No\s+Liability|Co\.?|Company|P\/L)\s*$/i;
const ORG_HINT = /(?:\bPty\b|\bLtd\b|\bLimited\b|\bInc\b|\bCorp|\bLLC\b|\bTrust\b|\bHoldings\b|\bGroup\b|\bPartners\b|\bLawyers\b|\bCouncil\b|\bAssociation\b|\bFoundation\b|\bFund\b|&|\bCo\b)/i;
const TITLES = "Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Professor|Sir|Dame|Lady|Lord|Hon";
const SUFFIXES_ANY = "(?:\\s*,?\\s*(?:Pty\\.?\\s*Ltd\\.?|Proprietary\\s+Limited|Pty\\.?\\s*Limited|Limited|Ltd\\.?|Inc\\.?|Corp\\.?|Corporation|LLC|P\\/L))?";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Flexible whitespace between the words of a name. */
const words = (s: string) => s.trim().split(/\s+/).map(esc).join("\\s+");
const L = "(?<![\\p{L}\\p{N}_])";
const R = "(?![\\p{L}\\p{N}_])";
/** Title Case and UPPER CASE forms of one word (plus the form as typed). */
const titleOrUpper = (w: string) => {
  const forms = new Set([w, cap(w), w.toUpperCase()]);
  return `(?:${[...forms].map(esc).join("|")})`;
};

export function inferKind(name: string): PartyKind {
  return ORG_HINT.test(name) ? "org" : "person";
}

/** Parses a matter's Parties box: one party per line, aliases in brackets or after "aka". */
export function parsePartiesText(text: string): MatterParty[] {
  const out: MatterParty[] = [];
  for (const raw of String(text ?? "").split(/\r?\n|;/)) {
    let line = raw.replace(/^\s*[-*\u2022]\s*/, "").replace(/^[A-Za-z ]{2,20}:\s+/, "").trim();
    if (!line) continue;
    const aliases: string[] = [];
    line = line.replace(/\(([^)]*)\)/g, (_m, inner: string) => { aliases.push(...inner.split(",")); return " "; });
    const aka = line.split(/\s+(?:aka|a\.k\.a\.?|also known as|trading as|t\/as|t\/a)\s+/i);
    line = aka.shift()!.trim();
    aliases.push(...aka);
    const clean = aliases.map((a) => a.replace(/^\s*(?:aka|t\/as|trading as)\s+/i, "").trim()).filter((a) => a.length >= 2);
    if (line.length >= 2) out.push({ name: line.replace(/\s+/g, " "), kind: inferKind(line), aliases: clean });
  }
  return out.slice(0, 50);
}

/** Builds the matchers for one party. Returns null when nothing is safe to match. */
export function partyMatcher(p: MatterParty, source = "party"): PartyMatcher | null {
  const name = String(p.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return null;
  const kind = p.kind ?? inferKind(name);
  const any: string[] = [];
  const exact: string[] = [];
  const addName = (n: string) => {
    const parts = n.split(" ").filter(Boolean);
    if (parts.length >= 2) any.push(words(n));
    // Names found by the model are less certain than names a lawyer typed: single words match Title or UPPER case only.
    else if (parts.length === 1 && parts[0].length >= 2) (isOrdinary(parts[0]) || source === "ner" ? exact.push(titleOrUpper(parts[0])) : any.push(esc(parts[0])));
  };

  if (kind === "place") {
    const parts = name.split(" ");
    if (parts.length >= 2) any.push(words(name));
    else exact.push(titleOrUpper(name));
  } else if (kind === "org") {
    const core = name.replace(ORG_SUFFIX, "").replace(/^the\s+/i, "").trim();
    any.push(words(name));
    if (core && core !== name) {
      const cw = core.split(" ");
      if (cw.length >= 2) any.push(words(core) + SUFFIXES_ANY);
      else if (!isOrdinary(core)) (source === "ner" ? exact.push(titleOrUpper(core) + SUFFIXES_ANY) : any.push(esc(core) + SUFFIXES_ANY));
      else any.push(esc(core) + "\\s*,?\\s*(?:Pty\\.?\\s*Ltd\\.?|Limited|Ltd\\.?|Inc\\.?|P\\/L)");
    }
  } else {
    const parts = name.replace(new RegExp(`^(?:${TITLES})\\.?\\s+`, "i"), "").split(" ");
    const first = parts[0];
    const last = parts[parts.length - 1];
    const middles = parts.slice(1, -1);
    if (parts.length === 1) {
      addName(first);
    } else {
      // An optional title goes with the name ("Mr John Smith" is one placeholder, not "Mr" plus one).
      const tp = `(?:(?:${TITLES})\\.?\\s+)?`;
      any.push(tp + words(parts.join(" ")));
      any.push(`${tp}${esc(first)}\\s+${esc(last)}`);
      any.push(`${esc(last)}\\s*,\\s*${esc(first)}(?:\\s+${middles.map(esc).join("\\s+")})?`);
      const fi = first[0].toUpperCase();
      const mi = middles.map((m) => m[0].toUpperCase());
      const inits = [fi, ...mi];
      // "J Smith", "J. Smith", "J. A. Smith", "JA Smith", "J.A. Smith" (initials must be capitals)
      exact.push(`${inits.map((i) => `${i}\\.?\\s*`).join("")}${titleOrUpper(last)}`.replace(/\\s\*(?=\(\?:)/, "\\s+"));
      if (inits.length > 1) exact.push(`${esc(inits.join(""))}\\s+${titleOrUpper(last)}`);
      exact.push(`${fi}\\.?\\s+${titleOrUpper(last)}`);
      exact.push(`(?:${TITLES})\\.?\\s+${titleOrUpper(last)}`);
      if (!isOrdinary(last)) (source === "ner" ? exact.push(titleOrUpper(last)) : any.push(esc(last)));
    }
  }
  for (const a of p.aliases ?? []) {
    const al = String(a).replace(/\s+/g, " ").trim();
    if (al.length >= 2) addName(al);
  }
  const build = (alts: string[], flags: string) =>
    alts.length ? new RegExp(`${L}(?:${[...new Set(alts)].sort((a, b) => b.length - a.length).join("|")})${R}`, flags) : null;
  const anyCase = build(any, "giu");
  const exactCase = build(exact, "gu");
  if (!anyCase && !exactCase) return null;
  return { type: kind === "org" ? "COMPANY" : kind === "place" ? "PLACE" : "PERSON", canonical: name, anyCase, exactCase, source };
}

export function partyMatchers(parties: MatterParty[] | undefined | null, source = "party"): PartyMatcher[] {
  const out: PartyMatcher[] = [];
  for (const p of parties ?? []) {
    const m = partyMatcher(p, source);
    if (m) out.push(m);
  }
  // Longer names first, so "John Smith Pty Ltd" wins over the person "John Smith".
  return out.sort((a, b) => b.canonical.length - a.canonical.length);
}

/** Replaces every variant of a party with what `repl` returns. */
export function replaceParty(text: string, m: PartyMatcher, repl: () => string): string {
  let out = text;
  if (m.anyCase) out = out.replace(m.anyCase, () => repl());
  if (m.exactCase) out = out.replace(m.exactCase, () => repl());
  return out;
}

export function containsParty(text: string, m: PartyMatcher): boolean {
  for (const re of [m.anyCase, m.exactCase]) {
    if (!re) continue;
    re.lastIndex = 0;
    if (re.test(text)) { re.lastIndex = 0; return true; }
  }
  return false;
}
