# Saabai Design System

**Source of truth for all visual decisions on saabai.ai.**
All tokens are defined in `saabai-site/app/globals.css`. Update that file to re-skin the entire site — never hardcode colour values in components.

---

## 1. Logo Usage

**Asset:** `public/brand/saabai-logo.png`
Sampled colours from the logo define the entire site palette (see §2).

| Context | Size | Treatment |
|---|---|---|
| Nav (desktop) | 212 × 56px | Full colour, no filter |
| Footer | 100 × 28px | Full colour, no opacity |
| Social / favicon | 32 × 32px | Helix mark only (crop) |

**Rules:**
- Never apply `brightness-0 invert` or opacity filters — the logo background (`#0b092e`) matches the site background exactly, so it sits natively
- Always use the PNG asset; never recreate the logo in CSS or SVG
- Minimum clear space: equal to the height of the helix mark on all sides
- Never place the logo on a surface lighter than `--saabai-surface-raised`

---

## 2. Colour Palette

All values sampled directly from `saabai-logo.png`.

### Raw Brand Values

| Role | Hex | Source |
|---|---|---|
| Logo background | `#0b092e` | Dominant pixel (153K occurrences) |
| Helix teal | `#62c5d1` | Helix S-mark accent |
| Mid blue | `#1f4dc5` | Helix inner gradient |
| Deep blue | `#0915a4` | Helix base / gradient anchor |
| Wordmark white | `#ffffff` | Logo text |

### Semantic Palette

| Token (CSS var) | Hex | Use |
|---|---|---|
| `--saabai-bg` | `#0b092e` | Main page background |
| `--saabai-surface` | `#0f0d38` | Cards, section surfaces |
| `--saabai-surface-raised` | `#141240` | Hover state, featured cards |
| `--saabai-nav` | `#0b092ef2` | Nav bar (94% opacity + blur) |
| `--saabai-teal` | `#62c5d1` | Primary accent — buttons, links, stats |
| `--saabai-teal-bright` | `#82d8e2` | Hover state for teal elements |
| `--saabai-blue` | `#1f4dc5` | Secondary accent |
| `--saabai-blue-deep` | `#0915a4` | Gradient anchor / deep glow |
| `--saabai-text` | `#f0f4ff` | Primary text |
| `--saabai-text-muted` | `#8399c0` | Body copy, descriptions |
| `--saabai-text-dim` | `#7a94c4` | Labels, eyebrows, captions |
| `--saabai-border` | `#62c5d11a` | Standard border (~10% teal) |
| `--saabai-border-accent` | `#62c5d140` | Featured card border (~25% teal) |

---

## 3. UI Tokens (Tailwind)

All CSS vars are registered in the `@theme inline` block and available as Tailwind utility classes:

```
bg-saabai-bg              → main page background
bg-saabai-surface         → card background
bg-saabai-surface-raised  → elevated / hover surface

text-saabai-text          → primary text
text-saabai-text-muted    → secondary / body text
text-saabai-text-dim      → labels, eyebrows

text-saabai-teal          → accent links / stat numbers
bg-saabai-teal            → primary CTA button fill
bg-saabai-teal-bright     → hover state for teal buttons

border-saabai-border      → standard card / section borders
border-saabai-border-accent → featured card top border
```

**Glow tokens** (used inline via `style={}` prop or CSS):

| Token | Value | Use |
|---|---|---|
| `--saabai-glow` | `#62c5d118` (9%) | Ambient resting glow |
| `--saabai-glow-mid` | `#62c5d12e` (18%) | Hero section, stat numbers |
| `--saabai-glow-strong` | `#62c5d13d` (24%) | CTA section, button shadow |

---

## 4. Typography

**Font:** Geist Sans (loaded via Next.js Google Fonts in `layout.tsx`)
**Fallback:** `system-ui, sans-serif`
**Rendering:** `-webkit-font-smoothing: antialiased`

### Scale

| Role | Class | Weight | Tracking |
|---|---|---|---|
| Hero headline (H1) | `text-6xl md:text-7xl lg:text-[86px]` | `font-semibold` | `tracking-[-0.03em]` |
| Section headline (H2) | `text-3xl md:text-4xl` | `font-semibold` | `tracking-tight` |
| Card headline (H3) | `text-lg` | `font-semibold` | `tracking-tight` |
| Body copy | `text-base` | `font-normal` | default |
| Eyebrow / label | `text-[11px]` | `font-medium` | `tracking-[0.2em]` |
| Stat number | `text-5xl md:text-6xl` | `font-semibold` | `tracking-tight` |
| Caption / fine print | `text-xs` | `font-normal` | `tracking-wide` |

### Text Colours

| Context | Token |
|---|---|
| Headlines | `text-saabai-text` (`#f0f4ff`) |
| Body / descriptions | `text-saabai-text-muted` (`#8399c0`) |
| Labels / eyebrows / captions | `text-saabai-text-dim` (`#7a94c4`) |
| Accent / stat numbers | `text-saabai-teal` (`#62c5d1`) |

### Gradient Text

Apply the `.text-gradient` CSS utility class for headline accent phrases:

```css
.text-gradient {
  background: linear-gradient(135deg, var(--saabai-text) 0%, var(--saabai-teal) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Use on:** key phrase in hero H1, CTA section H2. Do not overuse — one or two instances per page maximum.

---

## 5. Button Styles

### Primary CTA

```jsx
<a className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide">
  Label
</a>
```

| Property | Value |
|---|---|
| Background | `bg-saabai-teal` (`#62c5d1`) |
| Text | `text-saabai-bg` (`#0b092e`) — dark navy on teal |
| Padding | `px-9 py-[14px]` |
| Radius | `rounded-xl` |
| Font | `font-semibold text-base tracking-wide` |
| Hover | `bg-saabai-teal-bright` (`#82d8e2`) |

### Secondary / Ghost

```jsx
<a className="border border-saabai-border px-9 py-[14px] rounded-xl font-medium text-base text-saabai-text-muted hover:border-saabai-teal/50 hover:text-saabai-text transition-colors">
  Label
</a>
```

| Property | Value |
|---|---|
| Background | transparent |
| Border | `border-saabai-border` |
| Text | `text-saabai-text-muted` |
| Hover border | `saabai-teal` at 50% |
| Hover text | `text-saabai-text` |

### CTA Hero Button (with glow)

Same as primary, with added shadow:

```jsx
className="... shadow-[0_0_40px_var(--saabai-glow-mid)]"
```

### Text Link / Inline CTA

```jsx
<a className="text-base font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors flex items-center gap-2 group">
  Label <span className="group-hover:translate-x-0.5 transition-transform">→</span>
</a>
```

---

## 6. Card Styles

### Standard Card

```jsx
<div className="bg-saabai-surface p-10 hover:bg-saabai-surface-raised transition-colors relative">
  {/* Top accent gradient line */}
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />
  ...
</div>
```

### Featured Card (e.g. AI Audit "Start here")

Same as standard, with stronger top accent and raised base surface:

```jsx
<div className="bg-saabai-surface-raised p-12 relative">
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/60 to-transparent" />
  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-saabai-bg bg-saabai-teal px-3 py-1 rounded-full uppercase mb-6">
    ● Start here
  </span>
  ...
</div>
```

### Card Grid Container

Cards are assembled into grids using a gap-px trick that renders borders as the grid background colour bleeds through:

```jsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-saabai-border rounded-xl overflow-hidden">
  {/* cards — each sets its own bg so the gap-px shows as border */}
</div>
```

This approach keeps borders consistent without managing individual card border props.

### Industry Card (left-border hover reveal)

```jsx
<div className="bg-saabai-surface p-10 hover:bg-saabai-surface-raised transition-colors group relative overflow-hidden">
  <div className="absolute left-0 top-6 bottom-6 w-px bg-saabai-teal/0 group-hover:bg-saabai-teal/50 transition-colors" />
  ...
</div>
```

---

## 7. Spacing System

All spacing uses Tailwind's default scale. Site-specific conventions:

| Context | Value |
|---|---|
| Main section vertical padding | `py-32` (8rem) |
| Hero vertical padding | `pt-52 pb-36` |
| CTA section vertical padding | `py-40` |
| Card internal padding (large) | `p-12` |
| Card internal padding (medium) | `p-10` |
| Card internal padding (small) | `p-8` |
| Section max-width (content) | `max-w-5xl mx-auto` |
| Section max-width (narrow) | `max-w-4xl mx-auto` |
| Section max-width (text block) | `max-w-2xl mx-auto` |
| Nav horizontal padding | `px-8` |
| Page horizontal padding | `px-6` |
| Eyebrow → headline gap | `mb-5` |
| Headline → body gap | `mb-20` (before grid), `mb-8` (before sub-heading) |
| Card headline → body gap | `mb-3` |

---

## 8. Glow & Accent Rules

### Radial Glows

Applied as `position: absolute` `div` elements with `pointer-events-none` inside `relative overflow-hidden` sections:

```jsx
<div className="absolute inset-0 pointer-events-none" style={{
  background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)"
}} />
```

| Section | Glow strength | Ellipse size |
|---|---|---|
| Hero (wide ambient) | `glow-mid` | `90% 60%` |
| Hero (tight focal) | `glow` | `40% 30%` |
| CTA (wide) | `glow-strong` | `80% 70%` |
| CTA (focal) | `glow-mid` | `40% 40%` |

**Rules:**
- Always pair a wide ambient layer with a tighter focal layer for depth
- Anchor `at 50% 30%` for hero (glow rises from behind text), `at 50% 50%` for CTA
- Never add glows to every section — use them only at page entry points (hero) and conversion points (CTA)

### Accent Lines

Teal gradient lines used at section tops and as card decorations:

```jsx
{/* Section top — CTA */}
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

{/* Card top — standard */}
<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-border to-transparent" />

{/* Card top — featured */}
<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saabai-teal/60 to-transparent" />
```

### Stat Number Glow

Applied via the `.stat-glow` CSS utility in `globals.css`:

```css
.stat-glow {
  text-shadow:
    0 0 40px var(--saabai-glow-mid),
    0 0 80px var(--saabai-glow);
}
```

Use only on large display numbers (stats, pricing). Not on body text.

### Step Number Treatment

Large decorative step numbers use the glow token as their text colour directly:

```jsx
<div
  className="text-[80px] font-bold leading-none tracking-tight mb-6 select-none"
  style={{ color: "var(--saabai-glow-mid)" }}
>
  01
</div>
```

This makes them legible as visual anchors without competing with the headline.

---

## Source Files

| File | Purpose |
|---|---|
| `saabai-site/app/globals.css` | All colour tokens, Tailwind theme registration, utility classes |
| `saabai-site/app/layout.tsx` | Font loading (Geist Sans), metadata |
| `saabai-site/app/page.tsx` | Homepage — reference implementation of this design system |
| `Projects/Saabai/Brand/saabai-logo.png` | Master logo asset |
