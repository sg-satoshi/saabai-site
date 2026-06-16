import { put } from "@vercel/blob";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = join(__dirname, "../public/clients/nico-moretti");

const files = [
  "index.html",
  "sydney.html",
  "melbourne.html",
  "brisbane.html",
  "perth.html",
  "canberra.html",
  "hobart.html",
  "gold-coast.html",
  "faq.html",
];

for (const file of files) {
  const slug = file === "index.html" ? "index" : file.replace(".html", "");
  const blobPath = `sites/nico-moretti/${file}`;
  const content = readFileSync(join(clientDir, file), "utf-8");

  const blob = await put(blobPath, content, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    allowOverwrite: true,
  });

  console.log(`✓ ${slug} → ${blob.url}`);
}

console.log("\nAll pages uploaded.");
