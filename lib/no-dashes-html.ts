/**
 * House rule: no em dashes on any site. noDashesHtml() rewrites every em dash in an
 * HTML page's visible text, attribute values (title, meta, alt, placeholder) and
 * JSON-LD, leaving other scripts and styles alone. Ranges become "to"; a dash
 * between clauses becomes a comma.
 */
const EM = /&mdash;|&#8212;|&#x2014;|\\u2014/gi;

export function noEmDashText(input: string, afterOpenTag = false): string {
  if (!input || !/[\u2014]|&mdash;|&#8212;|&#x2014;|\\u2014/i.test(input)) return input;
  let s = input.replace(EM, "\u2014");
  // Ranges: 9am—5pm, $100—$300, 2—4 → "to"
  s = s.replace(/(\d(?:am|pm)?)\s*\u2014\s*(?=\$?\d)/gi, "$1 to ");
  // Dash before closing punctuation or the end of a segment: drop it
  s = s.replace(/\s*\u2014+\s*(?=[.!?,;:)]|$)/g, "");
  // Dash at the start of a segment: dropped right after an opening tag (an
  // attribution like <cite>— Sarah</cite>), a comma after a closing tag.
  s = s.replace(/^\s*\u2014+\s*/g, afterOpenTag ? "" : ", ");
  // Anything else: a clause break → comma
  s = s.replace(/\s*\u2014+\s*/g, ", ");
  return s.replace(/,\s*,/g, ",");
}

const TOKEN = /(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/gi;

export function noDashesHtml(html: string): string {
  if (!html || !/[\u2014]|&mdash;|&#8212;|&#x2014;|\\u2014/i.test(html)) return html;
  const parts = html.split(TOKEN);
  return parts.map((part, i) => {
    if (i % 2 === 0) {
      const prev = parts[i - 1] ?? "";
      // Page titles: "Brand — Tagline" reads best as "Brand | Tagline".
      if (/^<title\b/i.test(prev)) part = part.replace(/\s+(?:\u2014|&mdash;|&#8212;)\s+/gi, " | ");
      return noEmDashText(part, /^<[a-z][^>]*>$/i.test(prev) && !/\/>$/.test(prev));
    }
    if (/^<script\b/i.test(part)) {
      // Plain scripts: only a spaced dash between words in copy (e.g. a chat fallback message).
      if (!/type=["']application\/ld\+json["']/i.test(part)) return part.replace(/(\w[.?!]?) \u2014 (?=\w)/g, "$1, ");
      return part.replace(/"((?:[^"\\]|\\.)*)"/g, (_m, v: string) => `"${noEmDashText(v)}"`);
    }
    if (/^<(style|!--)/i.test(part)) return part;
    return part.replace(/=("[^"]*"|'[^']*')/g, (_m, v: string) => `=${v[0]}${noEmDashText(v.slice(1, -1))}${v[0]}`);
  }).join("");
}
