import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

export class ScanUrlError extends Error {}

/** Dev/QA only: some sandboxes resolve every host into 198.18.0.0/15 via an egress tunnel. Never honoured in production. */
const benchNetAllowed = () => process.env.NODE_ENV !== "production" && process.env.SITE_SCAN_ALLOW_BENCHMARK_NET === "1";

/** True for private, loopback, link-local, metadata, multicast and reserved addresses (v4 and v6). */
export function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19) && !benchNetAllowed())
    );
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    const hex = l.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) { const n = (parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16); return isBlockedIp([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".")); }
    return l === "::" || l === "::1" || /^f[cd]/.test(l) || /^fe[89ab]/.test(l) || l.startsWith("ff") || l.startsWith("64:ff9b") || l.startsWith("2001:db8");
  }
  return true;
}

/** Parses visitor input into a safe public http(s) URL, or throws ScanUrlError. No DNS here. */
export function parseTarget(input: string): URL {
  const t = (input ?? "").trim().slice(0, 300);
  if (!t) throw new ScanUrlError("Enter your website address.");
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t)) throw new ScanUrlError("Only http and https addresses can be scanned.");
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { throw new ScanUrlError("That does not look like a website address."); }
  return checkUrl(u);
}

export function checkUrl(u: URL): URL {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new ScanUrlError("Only http and https addresses can be scanned.");
  if (u.username || u.password) throw new ScanUrlError("Addresses with a login are not supported.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new ScanUrlError("Only standard web ports can be scanned.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(host) || /^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) throw new ScanUrlError("Please use your website name, not an IP address.");
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || host === "localhost") throw new ScanUrlError("That does not look like a public website address.");
  u.hash = "";
  return u;
}

export type Resolver = (host: string) => Promise<string[]>;
const defaultResolver: Resolver = async (h) => (await dnsLookup(h, { all: true })).map((a) => a.address);

/** Resolves a host and returns one public IP to pin. Throws if any answer is non-public. */
export async function resolvePublic(host: string, resolver: Resolver = defaultResolver): Promise<{ ip: string; family: 4 | 6 }> {
  let ips: string[];
  try { ips = await resolver(host); } catch { throw new ScanUrlError("DNS_NOT_FOUND"); }
  if (!ips.length) throw new ScanUrlError("DNS_NOT_FOUND");
  if (ips.some(isBlockedIp)) throw new ScanUrlError("That address points to a private network and cannot be scanned.");
  return { ip: ips[0], family: isIP(ips[0]) as 4 | 6 };
}
