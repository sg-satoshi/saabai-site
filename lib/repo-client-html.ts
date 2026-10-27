/**
 * Static client HTML that ships in this repo.
 *
 * Nico Moretti's live pages are a Blob copy of public/clients/nico-moretti.
 * Prefer the repo file so a deploy updates the site, including the privacy
 * policy, without a separate Blob upload. Other slugs stay Blob-first.
 */
import { readFileSync } from "fs";
import path from "path";

const REPO_FIRST_SLUGS = new Set(["nico-moretti"]);

export function readRepoClientHtml(slug: string, file: string): string | null {
  if (!REPO_FIRST_SLUGS.has(slug)) return null;
  if (!/^[\w.-]+$/.test(file)) return null;
  try {
    return readFileSync(path.join(process.cwd(), "public", "clients", slug, file), "utf-8");
  } catch {
    return null;
  }
}
