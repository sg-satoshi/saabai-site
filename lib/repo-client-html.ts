/**
 * Static client HTML that ships in this repo.
 *
 * SUNDER's live pages (sunder.com.au) are read from public/clients/sunder, and Nico Moretti's
 * (nicomoretti.au and /sites/nico-moretti) from public/clients/nico-moretti, in this repo, not from Vercel Blob.
 * A Blob edit, restore, hero image, chatbot inject, or publish in Site
 * Factory does not change what visitors see for these slugs. Other slugs stay
 * Blob-first. A subpage with no repo file still falls through to Blob.
 */
import { readFileSync } from "fs";
import path from "path";

// Explicit allowlist. SUNDER: the waitlist page ships with the code (sb:goal event, sb_ov headline picker), never a stale Blob copy.
const REPO_FIRST_SLUGS = new Set(["nico-moretti", "sunder", "heaven-thai-massage"]);

export function readRepoClientHtml(slug: string, file: string): string | null {
  if (!REPO_FIRST_SLUGS.has(slug)) return null;
  if (!/^[\w.-]+$/.test(file)) return null;
  try {
    return readFileSync(path.join(process.cwd(), "public", "clients", slug, file), "utf-8");
  } catch {
    return null;
  }
}
