import { normalizePath } from "./utils";

export type PatchContext = {
  filePath: string;
  instructions: string;
};

export type PatchRule = {
  name: string;
  appliesTo: (ctx: PatchContext) => boolean;
  apply: (content: string, ctx: PatchContext) => string;
};

export const patchRules: PatchRule[] = [
  {
    name: "theme-tailwind-backgrounds",
    appliesTo: (ctx) => isThemeInstruction(ctx.instructions),
    apply: (content) => {
      let updated = content;

      updated = updated.replace(/\bbg-white\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-gray-50\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-slate-50\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-neutral-50\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-zinc-50\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-gray-100\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-gray-200\b/g, "bg-[var(--saabai-surface)]");
      updated = updated.replace(/\bbg-neutral-100\b/g, "bg-[var(--saabai-surface)]");

      return updated;
    },
  },
  {
    name: "theme-tailwind-text",
    appliesTo: (ctx) => isThemeInstruction(ctx.instructions),
    apply: (content) => {
      let updated = content;

      updated = updated.replace(/\btext-black\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-gray-900\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-slate-900\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-gray-800\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-slate-800\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-gray-700\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-slate-700\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-gray-600\b/g, "text-[var(--saabai-text)]");
      updated = updated.replace(/\btext-gray-500\b/g, "text-[var(--saabai-text)]");

      return updated;
    },
  },
  {
    name: "theme-inline-styles",
    appliesTo: (ctx) => isThemeInstruction(ctx.instructions),
    apply: (content) => {
      let updated = content;

      updated = updated.replace(
        /background\s*:\s*["'`](white|#ffffff|#fff)["'`]/gi,
        'background: "var(--saabai-surface)"'
      );

      updated = updated.replace(
        /backgroundColor\s*:\s*["'`](white|#ffffff|#fff)["'`]/gi,
        'backgroundColor: "var(--saabai-surface)"'
      );

      updated = updated.replace(
        /color\s*:\s*["'`](black|#000000|#111111)["'`]/gi,
        'color: "var(--saabai-text)"'
      );

      return updated;
    },
  },
  {
    name: "theme-page-top-level-classes",
    appliesTo: (ctx) =>
      isThemeInstruction(ctx.instructions) &&
      normalizePath(ctx.filePath) === "app/page.tsx",
    apply: (content) => {
      return content.replace(/className="([^"]*)"/g, (_match, classes: string) => {
        let next = classes.trim();

        if (
          !next.includes("bg-[var(--saabai-bg)]") &&
          !next.includes("bg-[var(--saabai-surface)]")
        ) {
          next = `bg-[var(--saabai-bg)] ${next}`.replace(/\s+/g, " ").trim();
        }

        if (!next.includes("text-[var(--saabai-text)]")) {
          next = `text-[var(--saabai-text)] ${next}`.replace(/\s+/g, " ").trim();
        }

        return `className="${next}"`;
      });
    },
  },
  {
    name: "theme-css-variable-values-only",
    appliesTo: (ctx) =>
      isThemeInstruction(ctx.instructions) &&
      normalizePath(ctx.filePath).endsWith(".css"),
    apply: (content) => {
      let updated = content;

      // Only patch actual CSS variable assignments, never prose/comments.
      updated = updated.replace(
        /(--[a-zA-Z0-9-_]+\s*:\s*)#ffffff\b/gi,
        "$1var(--saabai-surface)"
      );

      updated = updated.replace(
        /(--[a-zA-Z0-9-_]+\s*:\s*)#fff\b/gi,
        "$1var(--saabai-surface)"
      );

      updated = updated.replace(
        /(--[a-zA-Z0-9-_]+\s*:\s*)#000000\b/gi,
        "$1var(--saabai-text)"
      );

      updated = updated.replace(
        /(--[a-zA-Z0-9-_]+\s*:\s*)#111111\b/gi,
        "$1var(--saabai-text)"
      );

      return updated;
    },
  },
  {
    name: "saabai-globals-token-theme",
    appliesTo: (ctx) =>
      isThemeInstruction(ctx.instructions) &&
      normalizePath(ctx.filePath) === "app/globals.css",
    apply: (content, ctx) => {
      let updated = content;
      const lower = ctx.instructions.toLowerCase();

      // Only do a real token rewrite when the instruction is clearly about
      // theme variables / tokens / globals.
      const wantsTokenUpdate =
        lower.includes("theme variables") ||
        lower.includes("tokens") ||
        lower.includes("globals") ||
        lower.includes("app/globals.css") ||
        lower.includes("reskin") ||
        lower.includes("branding");

      if (!wantsTokenUpdate) {
        return updated;
      }

      // Safer direct token rewrites.
      // These only apply if the variables already exist.
      updated = replaceCssVariable(updated, "--saabai-bg", "#0b092e");
      updated = replaceCssVariable(updated, "--saabai-surface", "#14123a");
      updated = replaceCssVariable(updated, "--saabai-text", "#ffffff");
      updated = replaceCssVariable(updated, "--saabai-border", "rgba(98, 197, 209, 0.22)");
      updated = replaceCssVariable(updated, "--saabai-accent", "#62c5d1");
      updated = replaceCssVariable(updated, "--saabai-accent-2", "#1f4dc5");
      updated = replaceCssVariable(updated, "--saabai-glow", "rgba(98, 197, 209, 0.35)");

      return updated;
    },
  },
  {
    name: "globals-css-body-theme",
    appliesTo: (ctx) =>
      isThemeInstruction(ctx.instructions) &&
      normalizePath(ctx.filePath) === "app/globals.css",
    apply: (content) => {
      let updated = content;

      const bodyBlock = `body {
  background: var(--saabai-bg);
  color: var(--saabai-text);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}`;

      if (/body\s*\{[\s\S]*?\}/m.test(updated)) {
        updated = updated.replace(/body\s*\{[\s\S]*?\}/m, bodyBlock);
      } else {
        updated = `${bodyBlock}\n\n${updated}`;
      }

      updated = updated.replace(
        /\.min-h-screen\s*\{[\s\S]*?(background|background-color)\s*:\s*(#fff|#ffffff|white)[\s\S]*?\}/gi,
        ""
      );

      return updated;
    },
  },
  {
    name: "trim-trailing-whitespace",
    appliesTo: () => true,
    apply: (content) => {
      return content
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n");
    },
  },
];

export function applyPatchRules(content: string, ctx: PatchContext): string {
  if (!content) return content;

  let updated = content;

  for (const rule of patchRules) {
    try {
      if (!rule.appliesTo(ctx)) continue;
      updated = rule.apply(updated, ctx);
    } catch (err) {
      console.log(
        `Patch rule "${rule.name}" threw on ${ctx.filePath}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return updated;
}

function replaceCssVariable(content: string, variableName: string, newValue: string): string {
  const pattern = new RegExp(`(${escapeRegExp(variableName)}\\s*:\\s*)([^;]+)(;)`, "g");
  return content.replace(pattern, `$1${newValue}$3`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isThemeInstruction(instructions: string): boolean {
  if (!instructions) return false;

  const lower = instructions.toLowerCase();

  const signals = [
    "theme",
    "dark",
    "light",
    "bg-",
    "var(--",
    "background",
    "surface",
    "text color",
    "globals.css",
    "app/page.tsx",
    "app/globals.css",
    "variables",
    "tokens",
    "branding",
    "brand",
    "reskin",
    "color",
    "colours",
    "colors",
  ];

  return signals.some((signal) => lower.includes(signal));
}