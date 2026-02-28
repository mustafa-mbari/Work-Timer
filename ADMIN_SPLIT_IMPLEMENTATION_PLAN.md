# Admin Panel Separation — Implementation Plan

## Context

The Work Timer web application (`web/`) currently bundles the admin panel alongside customer-facing features in a single Next.js 16 project. This creates several issues:

- **Security surface**: The customer app ships `SUPABASE_SERVICE_ROLE_KEY` usage paths and admin repository code, even though they're server-only. A misconfiguration could expose admin capabilities.
- **Deployment coupling**: Every admin change triggers a full customer app rebuild and redeploy.
- **Code clarity**: Mixed admin/customer schemas, repositories, and auth guards increase cognitive overhead.

**Goal**: Split into two fully isolated Vercel deployments — a **Customer App** (`app.w-timer.com`) and an **Admin App** (`admin.w-timer.com`) — both backed by the same Supabase project.

---

## 1. Architecture Overview

### High-Level System Design

```
                    ┌─────────────────┐
                    │   Supabase      │
                    │  (Single DB)    │
                    │  PostgreSQL     │
                    │  + Auth         │
                    │  + RLS          │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  Customer App   │          │   Admin App     │
     │  app.w-timer.com│          │ admin.w-timer.com│
     │  (Vercel #1)    │          │  (Vercel #2)    │
     │                 │          │                 │
     │ - Dashboard     │          │ - Overview      │
     │ - Time entries  │          │ - Users         │
     │ - Analytics     │          │ - Statistics    │
     │ - Billing       │          │ - Domains       │
     │ - Groups        │          │ - Promo codes   │
     │ - Earnings      │          │ - Subscriptions │
     │ - Settings      │          │ - Groups admin  │
     │ - Extension     │          │ - UI Test Lab   │
     │   auth bridge   │          │                 │
     │ - Stripe        │          │                 │
     │   webhooks      │          │                 │
     └─────────────────┘          └─────────────────┘
              │                             │
     ┌────────▼────────┐                    │
     │ Chrome Extension│                    │
     │  (offline-first)│                    │
     └─────────────────┘                    │
                                            │
                                   ┌────────▼────────┐
                                   │   Stripe API    │
                                   │ (read-only from │
                                   │  admin for      │
                                   │  manual grants) │
                                   └─────────────────┘
```

### App Separation Strategy

- **Customer App**: Everything end-users interact with — dashboard, time tracking, billing, analytics, groups, earnings, settings, extension auth bridge, Stripe webhooks
- **Admin App**: Internal tool for platform administrators — user management, platform stats, domain whitelisting, promo codes, subscription grants, group administration, UI test lab
- **Shared Backend**: Same Supabase project (PostgreSQL + Auth + RLS). Both apps use the same database tables and RPC functions. No API gateway between them.

### Shared Types

The `shared/` directory at the repository root contains `types.ts` (Database row types) and `constants.ts` (feature limits, pricing). These are imported by both web apps and the Chrome extension via TypeScript path aliases. This directory remains unchanged.

---

## 2. Step-by-Step Migration Plan

---

### Phase 1: Analysis — Identify All Admin Code

#### Tasks

- [x] Map all admin pages: `web/app/admin/` (7 sections: overview, users, stats, domains, promos, subscriptions, groups)
- [x] Map all admin API routes: `web/app/api/admin/` (domains, promos, subscriptions, groups)
- [x] Map admin-only repositories: `web/lib/repositories/admin.ts`, `web/lib/repositories/domains.ts`
- [x] Map mixed repositories requiring split: `promoCodes.ts` (admin CRUD + customer reads), `subscriptions.ts` (admin reads + customer reads + webhook writes)
- [x] Map admin-only services: `web/lib/services/analytics.ts` (getAdminStats)
- [x] Map admin auth guards: `requireAdminPage()`, `requireAdminApi()` in `web/lib/services/auth.ts`
- [x] Map admin navigation: `isAdmin` conditional in `web/app/(authenticated)/Sidebar.tsx` (lines 278-298)
- [x] Map admin middleware paths: `adminPaths` in `web/middleware.ts`
- [x] Map admin-only Zod schemas in `web/lib/validation.ts`: `promoCreateSchema`, `promoToggleSchema`, `grantPremiumSchema`, `domainCreateSchema`, `domainToggleSchema`, `adminCreateShareSchema`, `adminUpdateGroupSchema`
- [x] Map UI Test Lab: `web/app/(authenticated)/ui-test/` (admin-only design prototyping page)

#### Risks

- Overlooking an import chain that connects admin code to customer code
- Mixed-use repositories (`promoCodes.ts`, `subscriptions.ts`, `profiles.ts`) require careful function-level splitting

#### Validation Checklist

- [x] Every file in `web/app/admin/` is accounted for
- [x] Every file in `web/app/api/admin/` is accounted for
- [x] Every admin-only function in shared repositories is identified
- [x] Every admin-only Zod schema is identified
- [x] `isAdmin` usage in sidebar and layouts is identified

---

### Phase 2: Create the New Admin App

#### Tasks

**2.1 — Scaffold Project**
- [ ] Create `admin/` directory at repository root (sibling to `web/`)
- [ ] Initialize `admin/package.json` with dependencies (subset of `web/package.json`):
  - Core: `next@^16.1.6`, `react@^19.2.4`, `react-dom@^19.2.4`, `typescript@^5.7`
  - Supabase: `@supabase/ssr@^0.8.0`, `@supabase/supabase-js@^2.97.0`
  - Styling: `@tailwindcss/postcss@^4.0.0`, `tailwindcss@^4.0.0`, `tailwind-merge@^3.4.1`, `tailwindcss-animate@^1.0.7`
  - UI: `@radix-ui/*` (dialog, dropdown-menu, select, label, tabs, tooltip, avatar, separator, scroll-area), `lucide-react@^0.574.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`
  - Business: `stripe@^20.3.1`, `zod@^4.3.6`, `sonner@^2.0.7`, `recharts@^3.7.0`
  - Infra: `@fontsource-variable/inter`, `@vercel/analytics`
  - devDep: `shadcn@^3.8.5`
- [ ] Create `admin/tsconfig.json` with path aliases: `@/*` → `admin/*`, `@shared/*` → `shared/`
- [ ] Create `admin/next.config.js` (minimal — no assetPrefix)
- [ ] Create `admin/postcss.config.js` (same as `web/postcss.config.js`)
- [ ] Add `admin/` to root `pnpm-workspace.yaml`

**2.2 — Copy Shared UI Infrastructure**
- [ ] Copy `web/components/ui/` → `admin/components/ui/` (shadcn components)
- [ ] Copy `web/components/ThemeProvider.tsx` → `admin/components/ThemeProvider.tsx`
- [ ] Copy `web/components/ui/sonner.tsx` → `admin/components/ui/sonner.tsx`
- [ ] Create `admin/lib/utils.ts` (copy `cn()` from `web/lib/utils.ts`)
- [ ] Create `admin/app/globals.css` (copy from `web/app/globals.css`)
- [ ] Create `admin/components.json` (copy from `web/components.json`, update paths)

**2.3 — Copy Supabase Client Layer**
- [ ] Copy `web/lib/supabase/server.ts` → `admin/lib/supabase/server.ts`
- [ ] Verify `admin/` can import `shared/types.ts` via `@shared/types` alias

**2.4 — Copy Admin Pages and API Routes**
- [ ] Copy admin pages from `web/app/admin/` → `admin/app/(admin)/`:
  - `page.tsx` (overview), `users/page.tsx` + `UsersTable.tsx`, `stats/page.tsx`, `domains/page.tsx`, `promos/page.tsx`, `subscriptions/page.tsx`, `groups/page.tsx` + `AdminGroupsView.tsx`, `error.tsx`, `loading.tsx`, `AdminNav.tsx`
- [ ] Copy admin API routes from `web/app/api/admin/` → `admin/app/api/`:
  - `domains/route.ts`, `promos/route.ts`, `subscriptions/route.ts`, `groups/route.ts`
- [ ] Copy UI Test Lab from `web/app/(authenticated)/ui-test/` → `admin/app/(admin)/ui-test/`
- [ ] Update all import paths (from `@/app/admin/...` to `@/app/(admin)/...` where needed)

**2.5 — Copy Admin Repositories and Services**
- [ ] Copy `web/lib/repositories/admin.ts` → `admin/lib/repositories/admin.ts` (full copy)
- [ ] Copy `web/lib/repositories/domains.ts` → `admin/lib/repositories/domains.ts` (full copy)
- [ ] Copy `web/lib/services/analytics.ts` → `admin/lib/services/analytics.ts` (full copy)
- [ ] Create `admin/lib/repositories/promoCodes.ts` with admin-only functions:
  - Include: `getAllPromoCodes()`, `createPromoCode()`, `updatePromoCodeActive()`
  - Exclude: `getPromoByCode()`, `checkUserRedemption()` (customer-only)
- [ ] Create `admin/lib/repositories/subscriptions.ts` with admin-only functions:
  - Include: `getAllSubscriptions()`, `getAllSubscriptionsWithEmail()`, `upsertSubscription()`
  - Exclude: `getUserSubscription()`, `getUserSubscriptionForBilling()`, `getStripeCustomerId()`, `getStripeSubscriptionInfo()`, `updateSubscriptionByStripeId()`, `getSubscriptionPlanStatus()` (customer + webhook)
- [ ] Copy `web/lib/repositories/profiles.ts` → `admin/lib/repositories/profiles.ts` (full copy — `getProfileRole()` needed for auth)
- [ ] Copy `web/lib/stripe.ts` → `admin/lib/stripe.ts` (plan/price config for subscription grants)

**2.6 — Create Admin Auth Layer**
- [ ] Create `admin/lib/services/auth.ts`:
  - `getUser()` — React `cache()` wrapped, returns `User | null`
  - `requireAuth()` — redirects to `/login` if not authenticated
  - `requireAdmin()` — checks auth + `profiles.role === 'admin'`, redirects to `/login` if not
  - `requireAdminApi()` — returns `{ user, serviceSupabase }` or `null` for API routes
- [ ] Create `admin/middleware.ts`:
  - All routes require authentication except `/login`
  - Refresh Supabase session via `@supabase/ssr`
  - Redirect unauthenticated users to `/login`
- [ ] Create `admin/app/login/page.tsx`:
  - Email/password form calling Supabase auth
  - After auth success, verify `profiles.role === 'admin'` server-side
  - Reject non-admins with error message; sign out immediately
  - No registration form — admins are created via direct DB edit

**2.7 — Create Admin Layout and Navigation**
- [ ] Create `admin/app/layout.tsx` (root layout):
  - Theme injection script, Inter font import, globals.css
  - Metadata: "Work Timer Admin"
  - No i18n initially (hardcoded English — internal tool)
- [ ] Create `admin/app/(admin)/layout.tsx` (authenticated layout):
  - Call `requireAdmin()` for role enforcement
  - Simple layout: header + AdminNav + content area
  - No ExtensionBanner, no customer sidebar, no billing/subscription flags
- [ ] Adapt `AdminNav.tsx` as primary navigation (7 tabs: Overview, Users, Stats, Domains, Promos, Subscriptions, Groups)
- [ ] Create `admin/components/AdminHeader.tsx` (user email + logout button)

**2.8 — Create Admin Validation Schemas**
- [ ] Create `admin/lib/validation.ts` with:
  - `VALID_PLANS` constant
  - `promoCreateSchema`, `promoToggleSchema`
  - `grantPremiumSchema`
  - `domainCreateSchema`, `domainToggleSchema`
  - `adminCreateShareSchema`, `adminUpdateGroupSchema`
  - `parseBody()` helper function

#### Risks

- Missing import path updates after copying files — causes build failures
- Admin pages currently reference `AppSidebar` and `AppHeader` from the authenticated layout — must be replaced with admin-specific layout
- `upsertSubscription()` exists in both apps (customer for webhooks, admin for grants) — this is intentional duplication
- Dependency version drift between `web/` and `admin/` over time

#### Validation Checklist

- [ ] `cd admin && pnpm install && pnpm build` succeeds
- [ ] Admin login page loads and authenticates
- [ ] All 7 admin sections render with data
- [ ] All 4 admin API routes respond correctly
- [ ] Non-admin user rejected at login

---

### Phase 3: Remove Admin Logic from Customer App

#### Tasks

**3.1 — Delete Admin Pages and API Routes**
- [ ] Delete `web/app/admin/` directory entirely
- [ ] Delete `web/app/api/admin/` directory entirely
- [ ] Delete `web/app/(authenticated)/ui-test/` directory

**3.2 — Clean Up Auth Layer**
- [ ] Remove `requireAdminPage()` from `web/lib/services/auth.ts`
- [ ] Remove `requireAdminApi()` from `web/lib/services/auth.ts`
- [ ] Keep: `getUser()`, `requireAuth()`, `requireAuthApi()`

**3.3 — Clean Up Sidebar**
- [ ] In `web/app/(authenticated)/Sidebar.tsx`:
  - Remove `{isAdmin && ...}` block (Admin Panel + UI Test links)
  - Remove `isAdmin` prop from component interface
  - Remove unused `Shield`, `FlaskConical` icon imports
- [ ] In `web/app/(authenticated)/layout.tsx`:
  - Remove `isAdmin` prop passed to `<AppSidebar>`
  - Evaluate if `role` fetch from profiles query is still needed
  - Keep `isPremium` and `isAllIn` — still needed for feature gating

**3.4 — Clean Up Middleware**
- [ ] In `web/middleware.ts`:
  - Remove `adminPaths` constant and `isAdmin` check
  - Simplify auth condition to only check `isProtected`

**3.5 — Clean Up Validation**
- [ ] Remove from `web/lib/validation.ts`:
  - `promoCreateSchema`, `promoToggleSchema`
  - `grantPremiumSchema`
  - `domainCreateSchema`, `domainToggleSchema`
  - `adminCreateShareSchema`, `adminUpdateGroupSchema`
- [ ] Keep: `promoValidateSchema`, `promoRedeemSchema`, and all customer schemas

**3.6 — Clean Up Repositories**
- [ ] Delete `web/lib/repositories/admin.ts` (entirely admin-only)
- [ ] Delete `web/lib/repositories/domains.ts` (entirely admin-only)
- [ ] Delete `web/lib/services/analytics.ts` (the `getAdminStats()` aggregator)
- [ ] In `web/lib/repositories/promoCodes.ts`:
  - Delete: `getAllPromoCodes()`, `createPromoCode()`, `updatePromoCodeActive()`
  - Keep: `getPromoByCode()`, `checkUserRedemption()`
- [ ] In `web/lib/repositories/subscriptions.ts`:
  - Delete: `getAllSubscriptions()`, `getAllSubscriptionsWithEmail()`
  - Keep: all other functions (customer reads + webhook writes)
- [ ] In `web/lib/repositories/profiles.ts`:
  - Verify if `getAllProfiles()` is used only by admin; if so, delete it
  - Keep: `getProfileRole()`, `getProfile()`, `updateProfileDisplayName()`

#### Risks

- Accidentally deleting `upsertSubscription()` from customer app — it's needed by Stripe webhooks
- Removing `getProfileRole()` — it's still used by group admin checks in customer app
- Sidebar `isAdmin` prop removal might have cascading TypeScript errors

#### Validation Checklist

- [ ] `cd web && pnpm build` succeeds with zero errors
- [ ] Grep for `requireAdminPage`, `requireAdminApi` returns 0 results in `web/`
- [ ] Grep for deleted schema names returns 0 results in `web/`
- [ ] Grep for deleted function names returns 0 results in `web/`
- [ ] Navigating to `/admin` returns 404
- [ ] `POST /api/admin/domains` returns 404
- [ ] Sidebar shows no admin links for any user
- [ ] Stripe webhook still processes events correctly
- [ ] Promo code validation still works for customers

---

### Phase 4: Auth & RBAC Setup

#### Tasks

**4.1 — Supabase Cookie Domain Strategy**

Both apps use the same Supabase project. Decision: **separate sessions** (recommended).

- [ ] `app.w-timer.com` and `admin.w-timer.com` have separate cookie scopes by default
- [ ] Admin must log in separately on `admin.w-timer.com`
- [ ] Supabase cookie names don't conflict (domain-scoped)
- [ ] No cross-domain cookie sharing needed

**4.2 — Admin Role Detection**

Admin role is stored in `profiles.role` column (`'user' | 'admin'`).

- [ ] Admin login flow: Supabase email/password auth → server-side `getProfileRole()` check → reject if not admin
- [ ] `getProfileRole()` uses service client to bypass RLS (ensures role check always works)

**4.3 — Defense in Depth (3 Layers)**

1. **Middleware** (`admin/middleware.ts`): Verify Supabase session exists on every request
2. **Layout** (`admin/app/(admin)/layout.tsx`): Verify `profiles.role === 'admin'` via `requireAdmin()`
3. **API routes**: Each route calls `requireAdminApi()` which checks session + role

- [ ] Implement all three layers
- [ ] Non-admin users who somehow reach admin pages get redirected
- [ ] API routes return 403 for non-admins

#### Risks

- If Supabase session cookies overlap between subdomains (unlikely with standard `@supabase/ssr` defaults, but worth verifying)
- Admin must remember to log in separately on admin domain

#### Validation Checklist

- [ ] Admin user can authenticate on `admin.w-timer.com`
- [ ] Non-admin user rejected at login with clear error
- [ ] Unauthenticated API calls return 403
- [ ] Middleware redirects unauthenticated users to `/login`
- [ ] Layout redirects non-admin users after session check

---

### Phase 5: RLS & Security Hardening

#### Tasks

**5.1 — Database Security (No Changes)**

Both apps connect to the same Supabase project:
- [ ] Existing RLS policies remain unchanged
- [ ] Admin app uses `createServiceClient()` (service role) to bypass RLS — same pattern as today
- [ ] Customer app uses `createClient()` (anon key + session) with RLS enforced
- [ ] **No database migrations or RLS changes required**

**5.2 — Service Role Key Isolation**

- [ ] Both Vercel projects have `SUPABASE_SERVICE_ROLE_KEY` (customer for webhooks/promos/groups, admin for admin ops)
- [ ] Verify key is only in server-side env vars (no `NEXT_PUBLIC_` prefix) in both projects
- [ ] Admin app does NOT need: `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_EXTENSION_ID`, `NEXT_PUBLIC_ASSET_PREFIX`
- [ ] Customer app does NOT need any admin-specific env vars

**5.3 — Stripe Webhook Routing**

Decision: **Webhooks stay in customer app.**

- [ ] Stripe webhook endpoint: `app.w-timer.com/api/webhooks/stripe` (unchanged)
- [ ] No webhook endpoint in admin app
- [ ] Admin app uses Stripe SDK for reading subscription data and manual grants only

**5.4 — CORS and Allowed Origins**

- [ ] No CORS changes needed — both apps are server-rendered with no cross-origin API calls
- [ ] Add CORS headers only if cross-app API calls are needed in the future (YAGNI)

**5.5 — Search Engine Exclusion**

- [ ] Add `admin/public/robots.txt` with `Disallow: /` to prevent search engine indexing

#### Risks

- Service role key in customer app is necessary (webhooks, promo validation, group operations) — cannot be removed
- Misconfiguring environment variables could expose service role key client-side

#### Validation Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` in either app
- [ ] `STRIPE_SECRET_KEY` is never prefixed with `NEXT_PUBLIC_` in either app
- [ ] Admin app has no webhook endpoint
- [ ] Customer app has no admin API routes
- [ ] `robots.txt` blocks admin domain from indexing

---

### Phase 6: Deployment Configuration

#### Tasks

**6.1 — Vercel Project Setup**

Customer App (existing project):
- [ ] Repository: same repo, root directory: `web/`
- [ ] Domain: `app.w-timer.com` (or current `w-timer.com`)
- [ ] Framework: Next.js

Admin App (new project):
- [ ] Create new Vercel project
- [ ] Repository: same repo, root directory: `admin/`
- [ ] Domain: `admin.w-timer.com`
- [ ] Framework: Next.js

**6.2 — Domain Structure**

| App | Domain | Purpose |
|-----|--------|---------|
| Customer | `app.w-timer.com` | End-user time tracking |
| Admin | `admin.w-timer.com` | Platform administration |

**6.3 — Environment Variables**

Customer App (`web/`):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
STRIPE_PRICE_LIFETIME=...
STRIPE_PRICE_TEAM_10_MONTHLY=...
STRIPE_PRICE_TEAM_10_YEARLY=...
STRIPE_PRICE_TEAM_20_MONTHLY=...
STRIPE_PRICE_TEAM_20_YEARLY=...
STRIPE_PRICE_ALLIN_MONTHLY=...
STRIPE_PRICE_ALLIN_YEARLY=...
NEXT_PUBLIC_EXTENSION_ID=...
NEXT_PUBLIC_SITE_URL=https://app.w-timer.com
NEXT_PUBLIC_ASSET_PREFIX=...
```

Admin App (`admin/`):
```env
NEXT_PUBLIC_SUPABASE_URL=...          # Same Supabase project
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # Same
SUPABASE_SERVICE_ROLE_KEY=...         # Same
STRIPE_SECRET_KEY=...                 # For subscription grants (server-side)
STRIPE_PRICE_*                        # All price IDs for plan resolution
NEXT_PUBLIC_SITE_URL=https://admin.w-timer.com
```

Admin app does NOT need:
- `STRIPE_WEBHOOK_SECRET` — no webhook endpoint
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — no client-side Stripe
- `NEXT_PUBLIC_EXTENSION_ID` — no extension bridge
- `NEXT_PUBLIC_ASSET_PREFIX` — no corporate proxy concern

**6.4 — Production vs Preview**

- [ ] Both projects use Vercel's default preview deployment strategy (PR-based previews)
- [ ] Preview environments use same Supabase project (dev/staging) or a separate one
- [ ] Environment variables scoped per environment (Production / Preview / Development)

**6.5 — Monorepo Configuration**

- [ ] Update root `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'web'
    - 'admin'
  ```
- [ ] `shared/` stays as-is — both workspaces reference via path alias
- [ ] Each workspace has independent `pnpm install` / `pnpm build`
- [ ] Vercel auto-detects workspace root and builds the correct project

#### Risks

- Vercel monorepo detection might build wrong project on push
- Missing env var in admin project causes runtime errors

#### Validation Checklist

- [ ] Customer app deploys and builds on Vercel
- [ ] Admin app deploys and builds on Vercel
- [ ] `app.w-timer.com` resolves to customer app
- [ ] `admin.w-timer.com` resolves to admin app
- [ ] Both apps connect to same Supabase project
- [ ] Admin changes don't trigger customer app rebuild (and vice versa)

---

## 3. Supabase Setup Plan

### RLS Policies Strategy

**No changes required.** Both apps connect to the same Supabase project:
- Customer app uses `createClient()` (anon key + user session) — RLS enforced
- Admin app uses `createServiceClient()` (service role) — RLS bypassed
- Existing RLS policies continue to protect customer data

### Role-Based Access Control Design

| Layer | Mechanism | Location |
|-------|-----------|----------|
| Database | `profiles.role` column (`'user'` or `'admin'`) | PostgreSQL |
| Middleware | Supabase session check | `admin/middleware.ts` |
| Layout | `profiles.role === 'admin'` check | `admin/app/(admin)/layout.tsx` |
| API Route | `requireAdminApi()` — session + role | Each API route handler |

### Admin Role Detection Logic

```
1. User authenticates via Supabase Auth (email/password)
2. Server fetches profiles.role using service client (bypasses RLS)
3. If role !== 'admin' → sign out + show error
4. If role === 'admin' → create session, redirect to dashboard
```

### Security Best Practices

- Service role key is server-side only (never `NEXT_PUBLIC_` prefixed)
- Role checks use service client to prevent RLS from hiding the profile
- Three-layer defense: middleware → layout → API route
- No client-side role caching — always server-verified

### Environment Variable Structure

See Section 6.3 above for the complete variable listing per app.

---

## 4. Vercel Deployment Plan

See Phase 6 above for complete details including:
- Two separate Vercel projects from the same repository
- Domain structure: `app.w-timer.com` + `admin.w-timer.com`
- Environment variables per app
- Production vs Preview strategy

---

## 5. Folder Structure Proposal

### Customer App (`web/`) — After Cleanup

```
web/
  app/
    (authenticated)/    # Dashboard, entries, analytics, earnings, billing, settings, groups
    api/                # Customer + webhook API routes (NO /api/admin/)
      auth/             # Sign-in, sign-up, magic-link, forgot-password, google, session
      billing/          # Portal, upgrade
      checkout/         # Stripe checkout
      devices/          # Device management
      entries/          # Time entry CRUD
      groups/           # Group CRUD, shares, invitations
      promo/            # Validate, redeem
      profile/          # Profile update
      projects/         # Project CRUD
      settings/         # User settings
      tags/             # Tag CRUD
      webhooks/stripe/  # Stripe webhook handler
    auth/               # OAuth callback + extension bridge
    login/, register/   # Auth forms
    page.tsx            # Landing page
    globals.css
  components/
    ui/                 # shadcn/ui components
    Navbar.tsx, PricingPlans.tsx, ThemeToggle.tsx, ExtensionBanner.tsx, ...
  lib/
    repositories/       # profiles, subscriptions (customer subset), promoCodes (customer subset),
                        # projects, tags, timeEntries, userSettings, syncCursors, earnings,
                        # groups, groupInvitations, groupSharing, groupShares, analytics
    services/           # auth (NO admin guards), billing, earnings, groups
    supabase/           # server.ts, client.ts
    shared/             # types.ts symlink or path alias to shared/
    validation.ts       # Customer-only Zod schemas
    stripe.ts           # Stripe singleton + price config
    utils.ts            # cn() helper
    theme.ts            # Cookie-based theme provider
  middleware.ts         # Auth guards (NO admin path checks)
```

### Admin App (`admin/`) — New

```
admin/
  app/
    (admin)/            # Route group — all pages require admin auth
      page.tsx          # Overview dashboard (stats grid, premium breakdown, recent signups)
      users/            # User listing with search & pagination
        page.tsx
        UsersTable.tsx
      stats/            # Platform analytics (DAU/WAU/MAU, charts, breakdowns)
        page.tsx
      domains/          # Domain whitelist management
        page.tsx
      promos/           # Promo code CRUD
        page.tsx
      subscriptions/    # Manual premium grants
        page.tsx
      groups/           # Group administration
        page.tsx
        AdminGroupsView.tsx
      ui-test/          # UI Test Lab (design prototyping)
        page.tsx
        UITestLab.tsx
      layout.tsx        # Admin layout with requireAdmin() guard
      error.tsx         # Error boundary
      loading.tsx       # Loading skeleton
    api/                # Admin API routes
      domains/route.ts
      promos/route.ts
      subscriptions/route.ts
      groups/route.ts
    login/              # Admin login page
      page.tsx
    layout.tsx          # Root layout (theme, font, globals)
    globals.css         # Tailwind v4 imports + dark mode custom variant
  components/
    ui/                 # shadcn/ui components (copied subset)
    AdminNav.tsx        # Primary navigation (7 tabs)
    AdminHeader.tsx     # User email + logout button
  lib/
    repositories/
      admin.ts          # RPC calls (platform stats, user growth, etc.)
      domains.ts        # Domain whitelist CRUD
      promoCodes.ts     # Promo code CRUD (admin-only subset)
      subscriptions.ts  # Subscription reads + grants (admin-only subset)
      profiles.ts       # getProfileRole() for auth + getAllProfiles()
    services/
      auth.ts           # getUser, requireAuth, requireAdmin, requireAdminApi
      analytics.ts      # getAdminStats() — aggregates 11 RPC calls
    supabase/
      server.ts         # createClient() + createServiceClient()
    validation.ts       # Admin-only Zod schemas + parseBody()
    stripe.ts           # Stripe singleton + price config
    utils.ts            # cn() helper
  middleware.ts         # All routes require auth (except /login)
  next.config.js
  tsconfig.json
  package.json
  postcss.config.js
  public/
    robots.txt          # Disallow: / (prevent indexing)
```

### Shared (`shared/`) — Unchanged

```
shared/
  types.ts              # Database row types (used by extension + web + admin)
  constants.ts          # Feature limits, pricing constants
```

---

## 6. Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-side only in both apps (no `NEXT_PUBLIC_` prefix)
- [ ] `STRIPE_SECRET_KEY` is server-side only in both apps (no `NEXT_PUBLIC_` prefix)
- [ ] Admin app login rejects non-admin users after Supabase auth success
- [ ] Admin app implements three-layer auth: middleware → layout → API route
- [ ] Customer app contains zero admin pages, zero admin API routes, zero admin navigation links
- [ ] Customer app's `web/lib/repositories/admin.ts` is deleted
- [ ] Customer app's `web/lib/repositories/domains.ts` is deleted
- [ ] Admin-only functions removed from customer's `promoCodes.ts` and `subscriptions.ts`
- [ ] Admin-only Zod schemas removed from customer's `validation.ts`
- [ ] `requireAdminPage()` and `requireAdminApi()` removed from customer's `auth.ts`
- [ ] Stripe webhooks remain exclusively in customer app
- [ ] No cross-app API calls exist (each app is fully self-contained)
- [ ] Admin app is not linked from customer app UI (no hrefs to `admin.w-timer.com`)
- [ ] Admin domain blocked from search engine indexing (`robots.txt` with `Disallow: /`)
- [ ] Admin app has no registration page — admin accounts created via direct DB edit only
- [ ] Environment variables audited: each app only has the vars it needs

---

## 7. Future Scalability Considerations

### API Separation

If the admin app grows, extract admin API routes into a standalone service (e.g., Hono on Cloudflare Workers, Express on Fly.io):
- Decouple admin API from Next.js rendering
- Independent scaling of admin API
- Dedicated rate limiting for admin operations

### Admin API Isolation

Currently admin routes call Supabase directly via service client. For stronger isolation:
- Create a dedicated Supabase service role key for admin (separate from customer's)
- This allows revoking admin access without affecting customer app

### Monitoring Strategy

- **Vercel Analytics**: Already included in admin app dependencies
- **Error Tracking**: Add Sentry for admin app error monitoring
- **Audit Log**: Create `admin_audit_log` table to track admin actions:
  - Who performed the action (admin user ID)
  - What action was taken (promo creation, subscription grant, domain change)
  - When it happened (timestamp)
  - What was changed (before/after values)

### Admin Role Management

Current system: simple `'user' | 'admin'` role in `profiles` table.

For finer-grained permissions:
- Add `permissions` JSONB column or separate `admin_roles` table
- Permission checks per feature (e.g., view-only stats, manage promos, grant subscriptions)
- Role hierarchy: super_admin > admin > moderator

### Shared Package Extraction

If code duplication between `web/` and `admin/` becomes significant, extract `packages/shared-web/`:
- Supabase client factory (`createClient`, `createServiceClient`)
- Common Zod schemas and the `parseBody()` helper
- Shared repository functions (`getProfileRole()`)
- UI components used by both apps

This is YAGNI for now — current duplication is minimal (Supabase client, profiles repo, `cn()` helper).

### Microservice Option

Long-term, the admin app could evolve into a microservice architecture:
```
admin-web (UI)  →  admin-api (business logic)  →  Supabase (data)
```
This separates UI from data access, enables API versioning, and allows the admin API to serve multiple frontends (web dashboard, CLI tools, etc.).

---

## Execution Order Summary

| Step | Description | Files Affected |
|------|-------------|----------------|
| 2.1 | Scaffold admin project | ~5 config files (new) |
| 2.2 | Copy UI infrastructure | ~15 component files (new) |
| 2.3 | Copy Supabase client | 2 files (new) |
| 2.4 | Copy admin pages + API routes | ~17 files (new) |
| 2.5 | Copy admin repos + services | ~7 files (new) |
| 2.6 | Create admin auth | 3 files (new) |
| 2.7 | Create admin layout + nav | 4 files (new) |
| 2.8 | Create admin validation | 1 file (new) |
| 3.1 | Delete admin pages/routes from web | Delete ~20 files |
| 3.2 | Clean up web auth | Edit 1 file |
| 3.3 | Clean up web sidebar + layout | Edit 2 files |
| 3.4 | Clean up web middleware | Edit 1 file |
| 3.5 | Clean up web validation | Edit 1 file |
| 3.6 | Clean up web repositories | Edit 4 files, delete 3 files |

**Critical path**: Phase 2 (create admin app) must complete and be verified before Phase 3 (remove from customer app). Within Phase 2, steps 2.1–2.3 must come first; then 2.4–2.8 can be parallelized.
