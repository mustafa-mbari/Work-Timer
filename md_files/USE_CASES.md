# Work-Timer Web App — Use Cases

> All current use cases for the companion website at `web/`.
> Last updated: 2026-02-18

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Billing & Subscriptions](#3-billing--subscriptions)
4. [Analytics](#4-analytics)
5. [Promo Codes (User)](#5-promo-codes-user)
6. [Extension Bridge](#6-extension-bridge)
7. [Admin — Overview](#7-admin--overview)
8. [Admin — Statistics](#8-admin--statistics)
9. [Admin — User Management](#9-admin--user-management)
10. [Admin — Domain Whitelist](#10-admin--domain-whitelist)
11. [Admin — Promo Code Management](#11-admin--promo-code-management)
12. [Admin — Manual Premium Grant](#12-admin--manual-premium-grant)
13. [Stripe Webhooks](#13-stripe-webhooks)
14. [Navigation & UI](#14-navigation--ui)

---

## 1. Authentication

### UC-1.1 — Email/Password Login
**Actor:** Visitor
**Route:** `/login`
**Flow:** User enters email + password → Supabase Auth validates → redirects to `/dashboard`.

### UC-1.2 — Magic Link (OTP) Login
**Actor:** Visitor
**Route:** `/login` (magic link tab)
**Flow:** User enters email → Supabase sends OTP email → user clicks link → session created → redirected to `/dashboard`.

### UC-1.3 — Google OAuth Login
**Actor:** Visitor
**Route:** `/login` → Google OAuth → `/auth/callback`
**Flow:** User clicks Google → Supabase OAuth redirect → Google auth → callback with code → session created → `/dashboard`.

### UC-1.4 — Register with Email/Password
**Actor:** New visitor
**Route:** `/register`
**Flow:** User fills name, email, password (strength indicator enforces quality) → Supabase creates account → email verification sent → redirected to `/dashboard`.

### UC-1.5 — Register via Google OAuth
**Actor:** New visitor
**Route:** `/register` → Google OAuth → `/auth/callback`
**Flow:** Same as UC-1.3 but creates a new account on first use.

### UC-1.6 — Extension-Mode Login
**Actor:** Extension user
**Route:** `/login?ext=true` (opened by Chrome Extension)
**Flow:** User authenticates normally → redirected to `/auth/callback/extension` → tokens passed to extension via `chrome.runtime.sendMessage` → bridge shows "Connected!" → user continues in extension.

### UC-1.7 — Extension-Mode Registration
**Actor:** New extension user
**Route:** `/register?ext=true`
**Flow:** Same as UC-1.4 / UC-1.5 but ends at extension bridge (UC-1.6 final step).

### UC-1.8 — Sign Out
**Actor:** Authenticated user
**Route:** Any page (via user menu in Navbar)
**Flow:** User clicks "Sign out" → Supabase session cleared → redirected to `/login`.

---

## 2. Dashboard

### UC-2.1 — View Account Overview
**Actor:** Authenticated user
**Route:** `/dashboard`
**Flow:** User views current subscription plan, plan source (Stripe / Domain Whitelist / Promo / Manual), renewal or cancellation date, and connected devices with last-sync timestamps.

### UC-2.2 — View Connected Devices
**Actor:** Authenticated user
**Route:** `/dashboard`
**Flow:** User sees a list of Chrome Extension devices that have synced to their account, including device name and last sync time.

### UC-2.3 — Navigate to Billing
**Actor:** Authenticated user
**Route:** `/dashboard` → `/billing`
**Flow:** Free users see upgrade options; premium users see "Manage Billing" link pointing to Stripe portal.

---

## 3. Billing & Subscriptions

### UC-3.1 — View Current Plan
**Actor:** Authenticated user
**Route:** `/billing`
**Flow:** User sees plan name, status (active / past_due / canceled), renewal date or cancellation-at-period-end notice, and the source that granted premium (if applicable).

### UC-3.2 — Upgrade to Monthly Plan ($1.99/mo)
**Actor:** Free user
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout
**Flow:** User clicks "Monthly" → API creates Stripe Checkout session (subscription mode) → user completes payment → webhook updates subscription → user is now premium.

### UC-3.3 — Upgrade to Yearly Plan ($9.99/yr)
**Actor:** Free user
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout
**Flow:** Same as UC-3.2 with yearly price.

### UC-3.4 — Purchase Lifetime Plan ($49 one-time)
**Actor:** Free user
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout
**Flow:** API creates Stripe Checkout session in `payment` mode (no recurring) → user pays → webhook sets lifetime subscription.

### UC-3.5 — Manage Subscription via Stripe Portal
**Actor:** Premium user (Stripe-billed)
**Route:** `/billing` → `POST /api/billing/portal` → Stripe Billing Portal
**Flow:** User clicks "Manage Subscription" → API creates portal session → user redirected to Stripe → can update payment method, view invoices, cancel subscription.

### UC-3.6 — Apply Promo Code at Checkout
**Actor:** Free user
**Route:** `/billing` (promo input) → `POST /api/promo/validate` → `POST /api/promo/redeem`
**Flow:** User enters promo code → validated (active, not expired, not already used) → if 100% discount, premium granted immediately; if partial, Stripe coupon applied to checkout session.

---

## 4. Analytics

### UC-4.1 — View Time Statistics Overview
**Actor:** Premium user
**Route:** `/analytics`
**Flow:** User sees 6 stats cards: Total Hours Tracked, Total Entries, Avg Hours/Day, Avg Session Duration, Current Streak (days), Best Day of Week.

### UC-4.2 — View Weekly Hours Trend
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Bar/line chart showing hours tracked per week over recent history.

### UC-4.3 — View Daily Hours Breakdown
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Daily granularity chart to identify high/low productivity days.

### UC-4.4 — View Project Distribution
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Pie or bar chart showing time split across projects.

### UC-4.5 — View Entry Type Distribution
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Chart showing proportion of Manual vs Stopwatch vs Pomodoro entries.

### UC-4.6 — View Peak Hours Heatmap
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Hourly distribution chart showing which hours of the day the user is most productive.

### UC-4.7 — View Day-of-Week Activity
**Actor:** Premium user
**Route:** `/analytics` (Charts section)
**Flow:** Bar chart or heatmap showing activity levels by day of week.

### UC-4.8 — View Project Progress Bars
**Actor:** Premium user
**Route:** `/analytics` (Project Progress section)
**Flow:** For each project with a target hours goal, user sees a progress bar with current vs target hours and completion percentage.

### UC-4.9 — Non-Premium Redirect to Billing
**Actor:** Free user
**Route:** `/analytics` → `/billing`
**Flow:** Free users attempting to access analytics are redirected to the billing page with an upgrade prompt.

---

## 5. Promo Codes (User)

### UC-5.1 — Validate a Promo Code
**Actor:** Authenticated user
**Endpoint:** `POST /api/promo/validate`
**Flow:** Client submits `{ code }` → server checks active status, date range, max uses, prior redemption by this user → returns `{ valid: true, promo }` or error message.

### UC-5.2 — Redeem a Promo Code (Full Discount)
**Actor:** Authenticated user
**Endpoint:** `POST /api/promo/redeem`
**Flow:** Server calls atomic `redeem_promo()` RPC → increments `current_uses` → grants premium directly → returns `{ success: true }`.

### UC-5.3 — Redeem a Promo Code (Partial Discount)
**Actor:** Authenticated user
**Endpoint:** `POST /api/promo/redeem`
**Flow:** Server calls `redeem_promo()` RPC → creates Stripe coupon with discount % → creates checkout session with coupon applied → returns `{ success: true, checkoutUrl }` → user redirected to discounted checkout.

---

## 6. Extension Bridge

### UC-6.1 — Connect Extension After Login
**Actor:** Extension user
**Route:** `/auth/callback/extension`
**Flow:** After login with `?ext=true`, ExtensionBridge sends `AUTH_LOGIN` message via `chrome.runtime.sendMessage` with `accessToken` + `refreshToken` → extension stores tokens → bridge shows "Connected!" with "Go to Dashboard" link.

### UC-6.2 — Handle Extension Not Installed
**Actor:** User without extension installed
**Route:** `/auth/callback/extension`
**Flow:** Bridge waits 5 seconds for extension response → timeout → shows "Extension not detected" with links to install extension or continue to dashboard anyway.

---

## 7. Admin — Overview

### UC-7.1 — View Platform Summary
**Actor:** Admin user
**Route:** `/admin`
**Flow:** Admin sees stats grid: Total Users, Premium Users, Free Users, Total Hours Tracked; premium breakdown by source (Stripe, Domain, Promo, Manual); conversion rate bar; last 10 sign-ups table.

---

## 8. Admin — Statistics

### UC-8.1 — View User Engagement Metrics
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Admin sees DAU, WAU, MAU, total users, new users this week (all from Supabase RPC functions, revalidated every 60s).

### UC-8.2 — View User Growth Chart
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Bar chart showing new user registrations for each of the last 8 weeks.

### UC-8.3 — View Premium Subscription Breakdown
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Stats split by plan type (Monthly / Yearly / Lifetime) and by source (Stripe / Domain Whitelist / Promo Code / Manual Grant).

### UC-8.4 — View Platform Usage Stats
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Total hours tracked, total entries, avg session duration, overall conversion rate (free → premium).

### UC-8.5 — View Content Breakdown
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Entry type distribution (Manual / Stopwatch / Pomodoro), total projects created, avg projects per user, avg entries per day over last 30 days.

### UC-8.6 — View Top Users by Hours
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Ranked table of users with the most total hours tracked.

### UC-8.7 — View Promo & Domain Stats
**Actor:** Admin user
**Route:** `/admin/stats`
**Flow:** Count of active promo codes, whitelisted domains, and manual premium grants.

---

## 9. Admin — User Management

### UC-9.1 — Browse All Users
**Actor:** Admin user
**Route:** `/admin/users`
**Flow:** Paginated table (15 users/page) showing email, display name, role, join date, plan, subscription status. Sorted by newest first.

### UC-9.2 — Search Users by Email
**Actor:** Admin user
**Route:** `/admin/users?search=...`
**Flow:** Admin enters partial email → page filters results to matching users.

### UC-9.3 — Paginate User List
**Actor:** Admin user
**Route:** `/admin/users?page=N`
**Flow:** Admin clicks next/previous → page offset changes → next 15 users loaded.

---

## 10. Admin — Domain Whitelist

### UC-10.1 — Add Whitelisted Domain
**Actor:** Admin user
**Route:** `/admin/domains` → `POST /api/admin/domains`
**Flow:** Admin enters domain (e.g. `company.com`) and selects a plan (monthly/yearly/lifetime) → validated via regex → inserted as active → any user whose email matches the domain automatically receives that plan.

### UC-10.2 — Deactivate a Domain
**Actor:** Admin user
**Route:** `/admin/domains` → `PATCH /api/admin/domains`
**Flow:** Admin clicks "Deactivate" → confirmation dialog shown → admin confirms → domain marked inactive → new matching users no longer receive premium from it.

### UC-10.3 — Reactivate a Domain
**Actor:** Admin user
**Route:** `/admin/domains` → `PATCH /api/admin/domains`
**Flow:** Admin clicks "Activate" on an inactive domain → domain marked active again.

### UC-10.4 — View All Whitelisted Domains
**Actor:** Admin user
**Route:** `/admin/domains`
**Flow:** Admin sees table of all domains with: domain name, plan, active/inactive status, created date, and action buttons.

---

## 11. Admin — Promo Code Management

### UC-11.1 — Create a Promo Code
**Actor:** Admin user
**Route:** `/admin/promos` → `POST /api/admin/promos`
**Flow:** Admin fills form: code (3-50 chars), discount % (1-100), plan, optional max uses → validated → inserted as active with `current_uses: 0` and `valid_from: now()`.

### UC-11.2 — Deactivate a Promo Code
**Actor:** Admin user
**Route:** `/admin/promos` → `PATCH /api/admin/promos`
**Flow:** Admin clicks "Deactivate" → confirmation → promo marked inactive → can no longer be redeemed by users.

### UC-11.3 — Reactivate a Promo Code
**Actor:** Admin user
**Route:** `/admin/promos` → `PATCH /api/admin/promos`
**Flow:** Admin clicks "Activate" on inactive promo → promo marked active again.

### UC-11.4 — Monitor Promo Code Usage
**Actor:** Admin user
**Route:** `/admin/promos`
**Flow:** Admin views table showing each code's `current_uses` vs `max_uses` and current status.

---

## 12. Admin — Manual Premium Grant

### UC-12.1 — Grant Premium to User by Email
**Actor:** Admin user
**Route:** `/admin/subscriptions` → `POST /api/admin/subscriptions`
**Flow:** Admin enters user email, selects plan, optionally sets end date → server looks up user via `auth.admin.listUsers()` → upserts subscription with `granted_by: 'admin_manual'` → user immediately has premium.

### UC-12.2 — View All Subscriptions
**Actor:** Admin user
**Route:** `/admin/subscriptions`
**Flow:** Admin sees table of all subscriptions with user email, plan, status, source (`stripe` / `domain` / `promo` / `admin_manual`), and period end date.

---

## 13. Stripe Webhooks

### UC-13.1 — Handle Successful Checkout
**Trigger:** `checkout.session.completed` webhook from Stripe
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** Stripe sends event → signature verified → idempotency check (rejects duplicate `event_id`) → subscription upserted with plan, Stripe customer ID, subscription ID, `status: 'active'`, `granted_by: 'stripe'`.

### UC-13.2 — Handle Subscription Renewal / Update
**Trigger:** `customer.subscription.updated` webhook
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** Subscription record updated: plan, status, `current_period_end` (from `items.data[0]`), `cancel_at_period_end` flag.

### UC-13.3 — Handle Subscription Cancellation
**Trigger:** `customer.subscription.deleted` webhook
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** Subscription downgraded to `plan: 'free'`, `status: 'canceled'`.

### UC-13.4 — Handle Failed Payment
**Trigger:** `invoice.payment_failed` webhook
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** Subscription status set to `'past_due'` → user retains access until Stripe gives up retrying.

---

## 14. Navigation & UI

### UC-14.1 — Toggle Dark/Light Theme
**Actor:** Any visitor
**Component:** `ThemeToggle` in Navbar
**Flow:** User clicks toggle → theme class flipped (`dark` / `light`) on `<html>` → cookie saved for persistence → dark mode applied via `@custom-variant dark` in CSS.

### UC-14.2 — Navigate Between Dashboard, Analytics, and Billing
**Actor:** Authenticated user
**Component:** Navbar
**Flow:** User clicks nav link → Next.js client-side navigation → page renders.

### UC-14.3 — Access Admin Panel
**Actor:** Admin user
**Component:** Navbar (user menu shows "Admin" link if `role === 'admin'`)
**Flow:** Admin clicks link → navigates to `/admin` → admin layout guard confirms role.

### UC-14.4 — View Toast Notifications
**Actor:** Any user
**Component:** Sonner `<Toaster>` (bottom-right)
**Flow:** Any API error or success triggers a toast notification with descriptive message.

### UC-14.5 — Mobile Navigation
**Actor:** Mobile user
**Component:** Navbar (hamburger menu)
**Flow:** User taps hamburger → dropdown menu with all nav links and theme toggle appears → tap link → navigates and menu closes.

---

## API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/checkout` | User | Create Stripe checkout session |
| `POST` | `/api/billing/portal` | User | Create Stripe billing portal session |
| `POST` | `/api/promo/validate` | User | Validate a promo code |
| `POST` | `/api/promo/redeem` | User | Redeem a promo code |
| `GET` | `/api/admin/domains` | Admin | List all whitelisted domains |
| `POST` | `/api/admin/domains` | Admin | Add a whitelisted domain |
| `PATCH` | `/api/admin/domains` | Admin | Toggle domain active status |
| `GET` | `/api/admin/promos` | Admin | List all promo codes |
| `POST` | `/api/admin/promos` | Admin | Create a promo code |
| `PATCH` | `/api/admin/promos` | Admin | Toggle promo code active status |
| `GET` | `/api/admin/subscriptions` | Admin | List all subscriptions |
| `POST` | `/api/admin/subscriptions` | Admin | Manually grant premium to user |
| `POST` | `/api/webhooks/stripe` | Stripe sig | Handle Stripe webhook events |

---

## Actor Summary

| Actor | Access Level | Key Capabilities |
|-------|-------------|-----------------|
| **Visitor** | Public | Login, register, view landing/terms/privacy |
| **Authenticated user** | Authenticated | Dashboard, billing, analytics (premium), promo codes |
| **Premium user** | Authenticated + active subscription | Full analytics, cloud sync via extension |
| **Admin user** | Authenticated + `role: 'admin'` | All admin pages, user management, domain/promo/subscription control |
| **Stripe** | Webhook signature | Trigger subscription state changes via webhooks |
| **Chrome Extension** | Extension bridge | Pass auth tokens via `chrome.runtime.sendMessage` |
