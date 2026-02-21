# Work-Timer Website — Structured Improvement Plan

> Based on audit of 24 pages, 4 layout groups, 17 shadcn components, zero i18n, and multiple layout inconsistencies.
> Desktop-only. English + German i18n. shadcn/ui components throughout.

---

## Current State Audit

| Area | Issue |
|------|-------|
| Container | Landing uses `max-w-[1600px]`, app uses flexible layout — no shared container standard |
| Sidebar | Custom-built, no shadcn Sidebar primitive, no collapse state, no a11y |
| Landing page | 567-line monolithic component, inline data arrays, hardcoded English |
| i18n | Zero setup — no library, no locale files, no switcher |
| Design tokens | Partial — dark surface tokens exist but no typography or spacing scale |
| shadcn | 17 components installed; missing Sidebar, ScrollArea, Collapsible, Tooltip, Accordion |
| Dark mode | Functional but inconsistent application across pages |
| Admin layout | Separate structure from authenticated — no shared sidebar system |

---

## Section 1 — Unifying Page Dimensions (Desktop Only)

### 1.1 Container Standard

Two container tiers:

| Tier | Use Case | Max Width | Padding |
|------|----------|-----------|---------|
| `container-content` | Authenticated app, settings, entries | `max-w-[1280px]` | `px-8` |
| `container-marketing` | Landing page, auth pages, public pages | `max-w-[1200px]` | `px-8` |

Both center with `mx-auto`. Current `max-w-[1600px]` on landing is too wide.

### 1.2 Spacing Grid (8px base)

| Token | Value | Use Case |
|-------|-------|----------|
| `spacing-1` | 8px | Internal component padding, icon gaps |
| `spacing-2` | 16px | Card padding (small), nav item spacing |
| `spacing-3` | 24px | Card padding (standard), section internal |
| `spacing-4` | 32px | Between related elements |
| `spacing-6` | 48px | Between page sections (compact) |
| `spacing-8` | 64px | Between major page sections |
| `spacing-12` | 96px | Between landing page sections |
| `spacing-16` | 128px | Hero section top/bottom |

### 1.3 Section Spacing Rules

- Landing page sections: `py-24` (96px) between each
- App page headers: `mb-8` (32px) below page title
- Card groups: `gap-4` to `gap-6`
- Form groups: `space-y-4`
- Navigation items: `gap-1` between items

### 1.4 Desktop-Only Breakpoints

| Breakpoint | Width | Notes |
|------------|-------|-------|
| `lg` | 1024px | Minimum supported desktop |
| `xl` | 1280px | Primary design target |
| `2xl` | 1440px | Large desktop (comfortable) |

Remove all `sm:` and `md:` breakpoints from layout-layer components.

### 1.5 Reusable Layout Components to Create

- `web/components/layout/Container.tsx` — Accepts `variant="content" | "marketing"`
- `web/components/layout/Section.tsx` — Consistent `py-24` section wrapper with optional `id`
- `web/components/layout/PageHeader.tsx` — Authenticated page title + subtitle block
- `web/components/layout/SectionHeader.tsx` — Centered heading + subtitle for landing sections

---

## Section 2 — Improving the Sidebar

### 2.1 shadcn Components to Install

| Component | Purpose |
|-----------|---------|
| `sidebar` | Primitive sidebar with keyboard and collapse support |
| `scroll-area` | Scrollable nav list |
| `collapsible` | Expandable nav groups |
| `tooltip` | Icon tooltips in collapsed state |

### 2.2 Sidebar Architecture

**Width states:**

| State | Width | Behavior |
|-------|-------|----------|
| Expanded | `w-60` (240px) | Icon + label visible |
| Collapsed | `w-16` (64px) | Icon only, tooltips on hover |

**Navigation groups:**

```
MAIN
  Dashboard
  Analytics
  Entries

ACCOUNT
  Billing
  Settings

ADMIN (conditional — admin users only)
  Admin Panel
```

**Footer area:**
- Language switcher (EN / DE)
- Theme toggle (Light / Dark / System)
- User avatar + email
- Sign out

### 2.3 Hover / Active / Focus States

| State | Style |
|-------|-------|
| Default | `text-stone-600 dark:text-stone-400` |
| Hover | `bg-stone-100 dark:bg-[var(--dark-hover)] text-stone-900 dark:text-stone-100` |
| Active | `bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400` |
| Focus | `ring-2 ring-indigo-500 ring-offset-1` |

### 2.4 Accessibility Requirements

- `<nav>` + `<ul>` structure
- Active page: `aria-current="page"`
- Icon-only buttons: `aria-label` on every icon
- Collapsed sidebar: tooltip via `<TooltipContent>`
- Keyboard: Tab traverses, Enter/Space activates, Escape closes dropdowns

### 2.5 Language Switcher Integration

In sidebar footer, above theme toggle:

```
[ EN ]  [ DE ]
```

- Two `Button` components with `variant="ghost"` and `size="sm"`
- Active language: `variant="secondary"` or border-highlighted
- Writes cookie: `locale=en|de; path=/; max-age=31536000`
- Same component reused in public Navbar (top-right)

---

## Section 3 — Landing Page Optimization

### 3.1 Section Structure (Ordered)

| # | Section | Purpose |
|---|---------|---------|
| 1 | Hero | Primary conversion hook — H1, subtitle, 2 CTAs, social proof |
| 2 | Problem Bridge | Pain points vs. solutions side-by-side |
| 3 | How It Works | 3-step numbered flow |
| 4 | Primary Features | 3 alternating image/text blocks |
| 5 | Feature Grid | 6-item icon grid |
| 6 | Testimonials | 3 user cards |
| 7 | Pricing | 4 plan cards |
| 8 | FAQ | 6 items in accordion |
| 9 | Final CTA | Gradient banner |

### 3.2 Hero Section

```
[Badge: "Free Forever · No Credit Card"]

H1: Main value proposition (2 lines max)
H2/p: Supporting subtitle (stone-600, 2 lines max)

[Primary CTA Button]  [Secondary CTA Button (outline)]

Social proof strip: ★★★★★  "Used by X+ developers"
```

### 3.3 CTA Button Hierarchy

| Level | Variant | Size | Use |
|-------|---------|------|-----|
| Primary | `default` | `lg` | Main section CTA |
| Secondary | `outline` | `lg` | Alternative action |
| Tertiary | `ghost` | `default` | Nav, in-text |

### 3.4 Typography Scale

| Element | Class |
|---------|-------|
| Section heading | `text-3xl font-bold tracking-tight` |
| Section subtitle | `text-lg text-stone-500 dark:text-stone-400` |
| Feature title | `text-xl font-semibold` |
| Feature body | `text-base text-stone-600 dark:text-stone-400` |
| Badge/label | `text-xs font-medium uppercase tracking-wide` |

### 3.5 Component Extraction

Page.tsx split into:

```
web/app/(public)/
  page.tsx                    (< 200 lines, layout only)
  _sections/
    HeroSection.tsx
    ProblemSection.tsx
    HowItWorksSection.tsx
    FeaturesSection.tsx
    FeatureGridSection.tsx
    TestimonialsSection.tsx
    PricingSection.tsx
    FaqSection.tsx
    CtaSection.tsx
  _data/
    landing.ts                (all content arrays, i18n-ready)
```

---

## Section 4 — i18n Architecture

### 4.1 Library

**`next-intl`** — de facto standard for Next.js App Router:
- First-class RSC support
- Type-safe translation keys
- Cookie-based locale (no URL restructuring)
- ICU message format (plurals, dates)

### 4.2 Locale Strategy

| Decision | Choice | Reason |
|----------|--------|--------|
| URL strategy | Cookie-based (no URL prefix) | No URL restructuring needed |
| Default locale | `en` | Primary market |
| Fallback | Always `en` | Never show untranslated keys |
| Detection order | Cookie → Accept-Language → default |

### 4.3 File Structure

```
web/
  messages/
    en.json          # Source of truth
    de.json          # German
    # fr.json        # Future: French
    # ar.json        # Future: Arabic (+ RTL dir hook)
  i18n/
    config.ts        # Locale list + default
    request.ts       # next-intl getRequestConfig()
```

### 4.4 Translation Key Naming

Organized as `namespace.section.key` (max 3 levels):

```json
{
  "common": {
    "nav": { "dashboard": "...", "analytics": "..." },
    "actions": { "signIn": "...", "save": "...", "delete": "..." },
    "status": { "loading": "...", "error": "...", "empty": "..." }
  },
  "landing": {
    "hero": { "badge": "...", "headline": "...", "subtitle": "..." },
    "features": {},
    "pricing": {},
    "faq": {}
  },
  "auth": { "login": {}, "register": {}, "forgotPassword": {} },
  "dashboard": {},
  "entries": {},
  "billing": {},
  "settings": {}
}
```

**Rules:**
- Keys: `camelCase`
- Namespaces: `camelCase`
- No abbreviations
- Max 3 levels deep
- Dynamic values: ICU format `"welcome": "Welcome, {name}!"`

### 4.5 Scalability Rules

- `en.json` is source of truth — all files must match key structure
- Missing keys in `de.json` fall back to `en` silently
- Adding language = create `fr.json` + add to `config.ts`
- RTL languages: add `dir` attribute hook to root layout

---

## Section 5 — Design System Consistency

### 5.1 Typography Components (`web/components/ui/typography.tsx`)

| Component | Classes |
|-----------|---------|
| `<H1>` | `text-4xl font-bold tracking-tight` |
| `<H2>` | `text-3xl font-bold tracking-tight` |
| `<H3>` | `text-2xl font-semibold` |
| `<H4>` | `text-xl font-semibold` |
| `<H5>` | `text-lg font-medium` |
| `<Body>` | `text-base text-stone-700 dark:text-stone-300` |
| `<Muted>` | `text-sm text-stone-500 dark:text-stone-400` |
| `<Caption>` | `text-xs text-stone-400 dark:text-stone-500` |

### 5.2 Button System

All buttons use shadcn `Button`. No custom button styling.

| Variant | Color | Use |
|---------|-------|-----|
| `default` | Indigo filled | Primary action |
| `outline` | Indigo border | Secondary action |
| `ghost` | Transparent | Nav, icon buttons |
| `secondary` | Stone filled | Alternative secondary |
| `destructive` | Rose filled | Delete, danger |
| `link` | Indigo text | Inline text actions |

| Size | Height | Padding |
|------|--------|---------|
| `sm` | 32px | `px-3` |
| `default` | 40px | `px-4` |
| `lg` | 48px | `px-6` |

### 5.3 Color Tokens (additions to globals.css `@theme`)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--color-primary` | `#6366f1` | `#818cf8` | Accent, CTAs |
| `--color-surface` | `#fafaf9` | `#1c1917` | Page background |
| `--color-card` | `#ffffff` | `#292524` | Card background |
| `--color-border` | `#e7e5e4` | `#44403c` | Dividers |
| `--color-muted` | `#78716c` | `#a8a29e` | Secondary text |
| `--color-success` | `#10b981` | `#34d399` | Success |
| `--color-warning` | `#f59e0b` | `#fbbf24` | Warning |
| `--color-danger` | `#f43f5e` | `#fb7185` | Error/danger |

### 5.4 Card Styling Standard

```
bg-white dark:bg-[var(--dark-card)]
border border-stone-200 dark:border-[var(--dark-border)]
rounded-xl shadow-sm p-6
```

---

## Section 6 — Implementation Phases

### Phase 1: Layout Foundation

**Goal:** Establish container system, spacing scale, shared layout components.

**Deliverables:**
- `web/components/layout/Container.tsx`
- `web/components/layout/Section.tsx`
- `web/components/layout/PageHeader.tsx`
- `web/components/layout/SectionHeader.tsx`
- Updated `globals.css` with full spacing + color tokens
- All layout files updated to use new container components

**Testing Checklist:**
- [ ] All pages within defined container max-widths
- [ ] Consistent horizontal padding across all layouts
- [ ] No layout shift between pages
- [ ] No `sm:` / `md:` breakpoints in layout components
- [ ] Dark/light renders correctly

**Review:** Screenshot every page at 1280px and 1440px.

---

### Phase 2: Sidebar Refactor

**Goal:** Replace custom sidebar with shadcn Sidebar. Add nav grouping, a11y, language switcher UI.

**Deliverables:**
- Install: `sidebar`, `scroll-area`, `collapsible`, `tooltip`
- `web/app/(authenticated)/Sidebar.tsx` — full refactor
- `web/components/LanguageSwitcher.tsx` — UI only (no logic yet)
- Admin sidebar alignment

**Testing Checklist:**
- [ ] All nav links functional
- [ ] Active states correct on every page
- [ ] Hover/focus states match spec
- [ ] Tab key traverses all items in order
- [ ] All icon elements have `aria-label`
- [ ] `aria-current="page"` on active link
- [ ] Language switcher visible in footer

**Review:** Keyboard-only navigation test — tab through sidebar without mouse.

---

### Phase 3: Landing Page Redesign

**Goal:** Restructure landing into clean, conversion-focused layout. Extract data, apply design system.

**Deliverables:**
- `web/app/(public)/page.tsx` — refactored (< 200 lines)
- `web/app/(public)/_sections/` — 9 section components
- `web/app/(public)/_data/landing.ts` — content arrays (i18n-prep)
- Install: `accordion` for FAQ

**Testing Checklist:**
- [ ] All 9 sections present in correct order
- [ ] CTA hierarchy correct (no two equal-weight primary CTAs)
- [ ] Typography scale applied consistently
- [ ] Section spacing: 96px between sections
- [ ] Dark mode correct on all sections
- [ ] No hardcoded font sizes or hex colors

**Review:** Conversion funnel audit — Hero → Pricing → CTA.

---

### Phase 4: i18n Implementation

**Goal:** Full i18n with English and German. All text extracted to JSON. Language switcher functional.

**Deliverables:**
- Install: `next-intl`
- `web/messages/en.json` — complete English strings
- `web/messages/de.json` — complete German translations
- `web/i18n/config.ts` + `web/i18n/request.ts`
- Middleware update for locale cookie detection
- `web/components/LanguageSwitcher.tsx` — fully functional
- All pages updated to `useTranslations()` / `getTranslations()`
- `generateMetadata()` using translated strings on all public pages

**Testing Checklist:**
- [ ] Switch to DE — every visible string changes
- [ ] Switch back to EN — strings revert
- [ ] No hardcoded English strings remain
- [ ] Cookie persists across navigation and browser restart
- [ ] Zero missing translation keys
- [ ] `<title>` and `<meta description>` respond to locale

**Review:** `grep` all `.tsx` files for common English words — any match = missed translation.

---

### Phase 5: Design System Standardization

**Goal:** Enforce consistent typography, buttons, colors, cards across every page.

**Deliverables:**
- `web/components/ui/typography.tsx` — H1–H5, Body, Muted, Caption
- `globals.css` — complete `@theme` token block
- Full button audit — replace custom buttons with shadcn `Button`
- Full card audit — standardize all surfaces
- Dark mode audit across all 24 pages
- Admin pages brought into design system

**Testing Checklist:**
- [ ] No `style={{}}` on typography
- [ ] No hardcoded hex colors in `className`
- [ ] All interactive elements use shadcn variants
- [ ] Cards: consistent `rounded-xl border shadow-sm p-6`
- [ ] Dark mode: all text passes WCAG AA
- [ ] Admin pages visually consistent with app pages

**Review:** Full-page screenshot audit at `xl` breakpoint in both modes.

---

### Phase 6: Final QA & Consistency Review

**Goal:** End-to-end validation. No regressions. Ship-ready.

**Full Checklist:**

Layout:
- [ ] Consistent container width on all 24 pages
- [ ] No horizontal overflow on any page
- [ ] Uniform section spacing

Sidebar:
- [ ] All nav items functional
- [ ] Active states correct after hard refresh
- [ ] Keyboard navigation complete

Landing Page:
- [ ] All sections visible at 1280px, 1440px, 1920px
- [ ] CTA buttons functional
- [ ] Pricing cards link to correct checkout

i18n:
- [ ] EN/DE complete, zero missing keys
- [ ] Language switcher in sidebar and navbar both functional
- [ ] Metadata translated for both locales
- [ ] Clear path documented for adding a third language

Design System:
- [ ] Typography consistent
- [ ] Color tokens everywhere (no hardcoded values)
- [ ] Dark mode complete

Accessibility:
- [ ] All buttons have accessible names
- [ ] All images have `alt` text
- [ ] WCAG AA contrast in both modes
- [ ] Tab order logical on every page

---

## shadcn Components to Install (Net New)

| Component | Phase | Purpose |
|-----------|-------|---------|
| `sidebar` | Phase 2 | Authenticated + admin sidebar |
| `scroll-area` | Phase 2 | Scrollable sidebar nav |
| `collapsible` | Phase 2 | Expandable nav groups |
| `tooltip` | Phase 2 | Icon labels in collapsed sidebar |
| `accordion` | Phase 3 | FAQ section on landing page |

Install command (from `web/`):
```bash
npx shadcn@latest add sidebar scroll-area collapsible tooltip accordion
```

---

## Measurable Improvement Targets

| Metric | Before | Target |
|--------|--------|--------|
| Pages with consistent container | ~40% | 100% |
| Hardcoded text strings | ~300+ | 0 |
| Supported languages | 1 | 2 |
| shadcn components used | 17 | 22+ |
| Landing page component lines | 567 | < 200 |
| ARIA label coverage | ~60% | 100% |

---

---

## Completion Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Layout Foundation | ✅ Complete | Container, Section, PageHeader, SectionHeader components created |
| Phase 2: Sidebar Refactor | ✅ Complete | shadcn Sidebar with collapsible, nav groups, LanguageSwitcher |
| Phase 3: Landing Page Redesign | ✅ Complete | 9 section components, page.tsx reduced from 567 → ~20 lines |
| Phase 4: i18n Implementation | ✅ Complete | next-intl, 210 keys EN+DE, cookie-based locale, LanguageSwitcher functional |
| Phase 5: Design System | ✅ Complete | typography.tsx, slate→stone migration, semantic tokens |
| Phase 6: Final QA | ✅ Complete | Production build OK (38 routes), 210/210 key parity confirmed |

*Completed: 2026-02-21. All 6 phases implemented successfully.*
