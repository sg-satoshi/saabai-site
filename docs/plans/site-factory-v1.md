# Site Factory v1 — Implementation Plan (Simplified)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a system that generates complete, unique AI-powered websites in under 60 seconds. Each site is custom-built by AI — no templates, no cookie-cutter layouts.

**Architecture:**
```
Business inputs (form) → AI generates unique HTML/CSS/JS → Static file output → Git push → Live
```

**Tech Stack:** Next.js API routes, Claude for full site generation, Redis for registry, static files in `public/sites/[slug]/`.

---

## Phase 1: Core Site Factory (MVP)

### Task 1: Create Site Registry

**Objective:** Redis-backed site registry for tracking all generated sites

**Files:**
- Create: `lib/site-registry.ts`

```typescript
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

export interface SiteConfig {
  id: string;
  slug: string;
  name: string;
  niche?: string;
  status: "draft" | "live" | "archived";
  url: string;
  business: {
    name: string;
    tagline?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  chatbot: {
    enabled: boolean;
    name: string;
    greeting: string;
    systemPrompt: string;
  };
  createdAt: number;
  updatedAt: number;
}

export async function createSite(config: Omit<SiteConfig, "id" | "createdAt" | "updatedAt">): Promise<SiteConfig> {
  const id = `site_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const site: SiteConfig = { ...config, id, createdAt: Date.now(), updatedAt: Date.now() };
  await redis.hset("saabai:sites", { [id]: JSON.stringify(site) });
  return site;
}

export async function getSite(id: string): Promise<SiteConfig | null> {
  const data = await redis.hget<string>("saabai:sites", id);
  return data ? JSON.parse(data) : null;
}

export async function listSites(): Promise<SiteConfig[]> {
  const data = await redis.hgetall<Record<string, string>>("saabai:sites");
  return data ? Object.values(data).map(s => JSON.parse(s)) : [];
}

export async function updateSite(id: string, updates: Partial<SiteConfig>): Promise<void> {
  const site = await getSite(id);
  if (!site) throw new Error("Site not found");
  const updated = { ...site, ...updates, updatedAt: Date.now() };
  await redis.hset("saabai:sites", { [id]: JSON.stringify(updated) });
}
```

**Verify:** `npm run build` → clean
**Commit:** `git add lib/site-registry.ts && git commit -m "feat(site-factory): site registry"`

---

### Task 2: Build AI Site Generation API

**Objective:** API that takes business inputs and outputs complete HTML site

**Files:**
- Create: `app/api/site-factory/generate/route.ts`

The API receives:
```json
{
  "businessName": "Smith Plumbing",
  "niche": "trades",
  "location": "Adelaide",
  "services": ["Emergency plumbing", "Blocked drains", "Hot water systems"],
  "phone": "0412 345 678",
  "email": "info@smithplumbing.com.au",
  "style": "modern"  // or "classic", "minimal", "bold"
}
```

The API:
1. Generates slug from business name
2. Calls Claude to generate complete HTML/CSS/JS site
3. Writes to `public/sites/[slug]/index.html`
4. Writes chat widget config to `public/sites/[slug]/chat-config.js`
5. Registers in Redis
6. Returns site URL

**Claude Prompt:**
```
Generate a complete, production-ready HTML website for a [niche] business called "[name]" in [location].

Requirements:
- Single-file HTML with embedded CSS and minimal JS
- Professional, modern design
- Sections: Hero (name + tagline + CTA), Services, About, Contact (form + phone/email), Footer
- Mobile-responsive
- SEO meta tags
- Contact form that POSTs to /api/site-factory/lead
- Embedded chat widget that loads from /sites/[slug]/chat-config.js
- Color scheme appropriate for [niche]
- No external CSS frameworks (pure CSS)
- Include structured data JSON-LD for LocalBusiness

Services to feature: [list]

Return ONLY the complete HTML file content. No markdown, no explanations.
```

**Verify:** `npm run build` → clean
**Commit:** `git add app/api/site-factory/generate/route.ts && git commit -m "feat(site-factory): AI site generation API"`

---

### Task 3: Build Lead Capture API

**Objective:** Each generated site needs a lead capture endpoint

**Files:**
- Create: `app/api/site-factory/lead/route.ts`

```typescript
export const runtime = "edge";

export async function POST(req: Request) {
  const { name, email, phone, message, siteSlug } = await req.json();
  
  // Store lead in Redis
  const lead = { name, email, phone, message, siteSlug, createdAt: Date.now() };
  await redis.lpush(`saabai:leads:${siteSlug}`, JSON.stringify(lead));
  
  // Optional: Send notification email
  // await sendNotification(siteSlug, lead);
  
  return Response.json({ success: true });
}
```

**Verify:** `npm run build` → clean
**Commit:** `git add app/api/site-factory/lead/route.ts && git commit -m "feat(site-factory): lead capture API"`

---

### Task 4: Build Dashboard UI

**Objective:** Admin page to create and manage sites

**Files:**
- Create: `app/saabai-admin/site-factory/page.tsx`

Features:
- Site list table (name, slug, status, URL, created date)
- "Create New Site" button → modal form
- Form fields: Business name, niche, location, services, phone, email, style
- "Generate" button → calls API, shows progress
- Actions per site: Preview (opens in new tab), Delete

**Verify:** `npm run build` → clean
**Commit:** `git add app/saabai-admin/site-factory/page.tsx && git commit -m "feat(site-factory): admin dashboard"`

---

### Task 5: Build Chat Widget Integration

**Objective:** Each generated site gets an embedded AI chatbot

**Files:**
- Create: `public/site-factory/chat-widget.js` (reusable widget)
- Modify: Generation API to inject widget into each site

The widget:
- Loads config from `chat-config.js`
- Connects to existing chat API (`/api/chat` or similar)
- Floating button bottom-right
- Expandable chat panel
- Styled to match site colors

**Verify:** `npm run build` → clean
**Commit:** `git add public/site-factory/ && git commit -m "feat(site-factory): reusable chat widget"`

---

### Task 6: Auto-Deploy on Generate

**Objective:** After site generation, auto-commit and push

**Modify:** `app/api/site-factory/generate/route.ts`

After writing files:
```typescript
import { execSync } from "child_process";

// Auto-deploy
execSync(`git add public/sites/${slug}/ && git commit -m "deploy: new site ${slug}" && git push origin main`, {
  cwd: process.cwd(),
  encoding: "utf-8",
});
```

**Verify:** `npm run build` → clean
**Commit:** `git add app/api/site-factory/generate/route.ts && git commit -m "feat(site-factory): auto-deploy on generate"`

---

## Acceptance Criteria

- [ ] Can create a new unique site in under 60 seconds
- [ ] Site includes: hero, services, about, contact, chatbot
- [ ] Each site looks different (AI-generated unique design)
- [ ] Mobile-responsive
- [ ] SEO-optimized with meta tags + JSON-LD
- [ ] Lead capture form works
- [ ] Chatbot embedded and functional
- [ ] Auto-deploys on generation
- [ ] Dashboard shows all sites with preview links
- [ ] Build passes with zero errors

---

**Ready for approval and execution.**
