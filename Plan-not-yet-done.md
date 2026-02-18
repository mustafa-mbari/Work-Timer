# Work-Timer Web App — Extended Use Cases

> All current and planned use cases for the companion website at `web/`.
> Last updated: 2026-02-18[USE_CASE.md]

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Billing & Subscriptions](#3-billing--subscriptions)
4. [Analytics](#4-analytics)
5. [Promo Codes (User)](#5-promo-codes-user)
6. [Extension Bridge](#6-extension-bridge)
7. [Settings](#7-settings)
8. [Entries](#8-entries)
9. [Admin — Overview](#9-admin--overview)
10. [Admin — Statistics](#10-admin--statistics)
11. [Admin — User Management](#11-admin--user-management)
12. [Admin — Domain Whitelist](#12-admin--domain-whitelist)
13. [Admin — Promo Code Management](#13-admin--promo-code-management)
14. [Admin — Manual Premium Grant](#14-admin--manual-premium-grant)
15. [Stripe Webhooks](#15-stripe-webhooks)
16. [Navigation & UI](#16-navigation--ui)

---

## 1. Authentication

### UC-1.1 — Email/Password Login  
**Actor:** Visitor  
**Route:** `/login`  
**Flow:**  
User enters email and password → client validates required fields and disables the submit button while processing → Supabase Auth validates credentials → on success, a session is created and user is redirected based on plan (premium → `/analytics`, free → `/dashboard`) → on failure, a specific error message is shown (invalid credentials, user not found, or email not verified).[USE_CASE.md]

### UC-1.2 — Magic Link (OTP) Login  
**Actor:** Visitor  
**Route:** `/login` (Magic Link tab)  
**Flow:**  
User switches to the Magic Link tab → enters email → Supabase sends a one-time login link or OTP email → UI shows a “Check your inbox” state with option to resend → user clicks link → session created → user redirected (premium → `/analytics`, free → `/dashboard`) → if link/OTP is expired or invalid, an error page with “Request new link” is shown.[USE_CASE.md]

### UC-1.3 — Google OAuth Login  
**Actor:** Visitor  
**Route:** `/login` → Google OAuth → `/auth/callback`  
**Flow:**  
User clicks “Continue with Google” → Supabase OAuth redirect → Google auth → callback with code → Supabase creates session → user redirected to `/analytics` if premium, or `/dashboard` if free → on error (denied consent, provider error), user is returned to `/login` with a toast error.[USE_CASE.md]

### UC-1.4 — Register with Email/Password  
**Actor:** New visitor  
**Route:** `/register`  
**Flow:**  
User fills name, email, and password → password strength indicator enforces minimum requirements (length, digits, symbols) and updates live → user must accept Terms and Privacy (checkbox) → Supabase creates the account → verification email is sent → user is redirected to `/verify-email` with information about the email and a “Resend verification” button → once email is verified and session is active, user can access `/dashboard` and `/analytics` depending on plan.[USE_CASE.md]

### UC-1.5 — Register via Google OAuth  
**Actor:** New visitor  
**Route:** `/register` → Google OAuth → `/auth/callback`  
**Flow:**  
User clicks “Sign up with Google” → Supabase OAuth flow starts → on first successful sign-in with this Google account, a new user record is created → session is created → user is redirected to `/dashboard` (free plan by default) → on subsequent logins with the same Google account, this behaves as a normal login (UC-1.3).[USE_CASE.md]

### UC-1.6 — Extension-Mode Login  
**Actor:** Extension user  
**Route:** `/login?ext=true` (opened by Chrome Extension)  
**Flow:**  
Chrome Extension opens `/login?ext=true` in a browser tab → user authenticates using any supported method → on success, user is redirected to `/auth/callback/extension` → page sends an `AUTH_LOGIN` message via `chrome.runtime.sendMessage` with `accessToken`, `refreshToken`, and a generated `device_id` → extension stores tokens and device metadata → bridge shows “Connected!” with a “Go to Dashboard” link → if the extension does not respond within a timeout, the page shows “Extension not detected” with install instructions and a `Retry` button.[USE_CASE.md]

### UC-1.7 — Extension-Mode Registration  
**Actor:** New extension user  
**Route:** `/register?ext=true`  
**Flow:**  
Chrome Extension opens `/register?ext=true` → user completes registration via email/password or Google (UC-1.4 / UC-1.5 flows) → after successful registration and session creation, the user is redirected to `/auth/callback/extension` → tokens and `device_id` are passed to the extension as in UC-1.6 → bridge shows “Connected!” and a CTA to start tracking time.[USE_CASE.md]

### UC-1.8 — Sign Out  
**Actor:** Authenticated user  
**Route:** Any page (via user menu in Navbar)  
**Flow:**  
User clicks “Sign out” → Supabase session is cleared on the client and server → access and refresh tokens are revoked where applicable → user is redirected to `/login` with a toast “You have been signed out” → any open extension session using the same tokens will detect invalid/expired tokens on next API call and prompt the user to re-login in extension mode.[USE_CASE.md]

### UC-1.9 — Session Refresh & Auto-Login  
**Actor:** Authenticated user  
**Context:** Web app and extension startup  
**Flow:**  
On app or extension load, the client checks for an existing Supabase session/refresh token → if present, a silent session refresh is attempted → on success, a fresh `access_token` is obtained and user remains logged in and is taken to last visited page (stored locally) → on failure (refresh token expired or revoked), session is cleared and user is redirected to `/login` (web) or shown a “Session expired, re-login” banner (extension) with a button that opens `/login?ext=true`.[USE_CASE.md]

### UC-1.10 — Enforce Email Verification  
**Actor:** User with unverified email  
**Route:** Accessing `/dashboard` or other protected routes  
**Flow:**  
User logs in with an unverified email → Supabase session is created, but when accessing protected pages the app detects `email_confirmed_at` is null → user is redirected to `/verify-email` → page shows which email the verification was sent to and a “Resend verification email” button → after email is verified (via link), the next attempt to access `/dashboard` or `/analytics` succeeds.[USE_CASE.md]

### UC-1.11 — Forgot Password (Password Reset)  
**Actor:** Visitor  
**Route:** `/forgot-password`  
**Flow:**  
User clicks “Forgot password?” on `/login` → redirected to `/forgot-password` → enters email → Supabase sends a password reset email with a secure link or token → user clicks the link and is taken to `/reset-password?token=...` → user enters a new password that meets strength requirements → password is updated → user is redirected to `/login` with a toast “Password updated, please sign in”.[USE_CASE.md]

### UC-1.12 — Change Password (Inside App)  
**Actor:** Authenticated user  
**Route:** `/settings/security`  
**Flow:**  
User opens the Security section → enters current password and new password → client validates new password strength → server verifies the current password via Supabase Auth → if valid, password is updated → user sees a success toast “Password changed successfully” → optionally, all other active sessions are revoked and the user is asked to log in again on other devices.[USE_CASE.md]

### UC-1.13 — Device & Session Management  
**Actor:** Authenticated user  
**Route:** `/settings/sessions`  
**Flow:**  
User opens the Sessions page → sees a list of active sessions/devices (web and extension) including device name, browser, last seen time, and location/approx region if available → user can click “Sign out from this device” to revoke a single session or “Sign out from other devices” to revoke all other sessions → Supabase refresh tokens corresponding to those sessions are invalidated → affected devices/extensions will see “Session expired” on next request.[USE_CASE.md]

### UC-1.14 — Brute Force & Rate Limiting Feedback  
**Actor:** Malicious actor / normal user  
**Route:** `/login`  
**Flow:**  
Application tracks failed login attempts per IP/email combination over a short time window → after N failed attempts within the window, further login attempts are temporarily blocked for that combination → user sees a generic error “Too many login attempts. Please try again in a few minutes.” without leaking whether the email exists → optionally, an admin-facing log or metric is incremented for security monitoring.[USE_CASE.md]

---

## 2. Dashboard

### UC-2.1 — View Account Overview  
**Actor:** Authenticated user  
**Route:** `/dashboard`  
**Flow:**  
User views current subscription plan, plan source (Stripe / Domain Whitelist / Promo / Manual), renewal or cancellation date, and connected devices with last-sync timestamps.[USE_CASE.md]

### UC-2.2 — View Connected Devices  
**Actor:** Authenticated user  
**Route:** `/dashboard`  
**Flow:**  
User sees a list of Chrome Extension devices that have synced to their account, including device name, browser, OS, and last sync time → user can disconnect a device, which revokes that device’s refresh token, and optionally rename it for clarity.[USE_CASE.md]

### UC-2.3 — Navigate to Billing  
**Actor:** Authenticated user  
**Route:** `/dashboard` → `/billing`  
**Flow:**  
Free users see upgrade options; premium users see a “Manage Billing” link pointing to Stripe portal.[USE_CASE.md]

### UC-2.4 — Post-Login Landing Logic  
**Actor:** Authenticated user  
**Route:** automatic after authentication  
**Flow:**  
After successful login/registration, the router checks subscription status and last visited page: if a “last_page” key is stored locally, user is redirected there; otherwise premium users are redirected to `/analytics`, free users to `/dashboard`.[USE_CASE.md]

### UC-2.5 — Dashboard Slider / Sections  
**Actor:** Authenticated user  
**Route:** `/dashboard`  
**Flow:**  
Dashboard uses a horizontal slider or tabbed layout with sections such as “Overview”, “Devices”, “Recent entries”, “Tips” → switching sections updates a `tab` query parameter (e.g. `/dashboard?tab=devices`) so the state is shareable and works with browser back/forward.[USE_CASE.md]

### UC-2.6 — Modern Dashboard Layout  
**Actor:** Authenticated user  
**Route:** `/dashboard`  
**Flow:**  
Dashboard adopts a modern CRM-style layout (sidebar navigation, colorful KPI cards, charts) similar to the provided design references, with full responsiveness and dark/light support.[file:22][file:23]

---

## 3. Billing & Subscriptions

### UC-3.1 — View Current Plan  
**Actor:** Authenticated user  
**Route:** `/billing`  
**Flow:**  
User sees plan name, status (active / past_due / canceled), renewal date or cancellation-at-period-end notice, and the source that granted premium (if applicable).[USE_CASE.md]

### UC-3.2 — Upgrade to Monthly Plan ($1.99/mo)  
**Actor:** Free user  
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout  
**Flow:**  
User clicks “Monthly” → API creates Stripe Checkout session (subscription mode) → user completes payment → webhook updates subscription → user is now premium.[USE_CASE.md]

### UC-3.3 — Upgrade to Yearly Plan ($9.99/yr)  
**Actor:** Free user  
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout  
**Flow:**  
Same as UC-3.2 with yearly price.[USE_CASE.md]

### UC-3.4 — Purchase Lifetime Plan ($49 one-time)  
**Actor:** Free user  
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout  
**Flow:**  
API creates Stripe Checkout session in `payment` mode (no recurring) → user pays → webhook sets lifetime subscription.[USE_CASE.md]

### UC-3.5 — Manage Subscription via Stripe Portal  
**Actor:** Premium user (Stripe-billed)  
**Route:** `/billing` → `POST /api/billing/portal` → Stripe Billing Portal  
**Flow:**  
User clicks “Manage Subscription” → API creates portal session → user redirected to Stripe → can update payment method, view invoices, cancel subscription.[USE_CASE.md]

### UC-3.6 — Apply Promo Code at Checkout  
**Actor:** Free user  
**Route:** `/billing` (promo input) → `POST /api/promo/validate` → `POST /api/promo/redeem`  
**Flow:**  
User enters promo code → validated (active, not expired, not already used) → if 100% discount, premium granted immediately; if partial, Stripe coupon applied to checkout session.[USE_CASE.md]

### UC-3.7 — Pricing Table Display  
**Actor:** Authenticated user  
**Route:** `/billing`  
**Flow:**  
User sees a reusable pricing section comparing Free, Monthly, Yearly, and Lifetime plans, including key feature flags (analytics access, number of devices, support priority); the current plan card is highlighted and its purchase button disabled; when `cancel_at_period_end` is true, the card shows “Will end on [date]” and may offer a “Renew” option.[USE_CASE.md]

---

## 4. Analytics

### UC-4.1 — View Time Statistics Overview  
**Actor:** Premium user  
**Route:** `/analytics`  
**Flow:**  
User sees 6 stats cards: Total Hours Tracked, Total Entries, Avg Hours/Day, Avg Session Duration, Current Streak (days), Best Day of Week.[USE_CASE.md]

### UC-4.2 — View Weekly Hours Trend  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Bar/line chart showing hours tracked per week over recent history.[USE_CASE.md]

### UC-4.3 — View Daily Hours Breakdown  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Daily granularity chart to identify high/low productivity days.[USE_CASE.md]

### UC-4.4 — View Project Distribution  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Pie or bar chart showing time split across projects.[USE_CASE.md]

### UC-4.5 — View Entry Type Distribution  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Chart showing proportion of Manual vs Stopwatch vs Pomodoro entries.[USE_CASE.md]

### UC-4.6 — View Peak Hours Heatmap  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Hourly distribution chart showing which hours of the day the user is most productive.[USE_CASE.md]

### UC-4.7 — View Day-of-Week Activity  
**Actor:** Premium user  
**Route:** `/analytics` (Charts section)  
**Flow:**  
Bar chart or heatmap showing activity levels by day of week.[USE_CASE.md]

### UC-4.8 — View Project Progress Bars  
**Actor:** Premium user  
**Route:** `/analytics` (Project Progress section)  
**Flow:**  
For each project with a target hours goal, user sees a progress bar with current vs target hours and completion percentage.[USE_CASE.md]

### UC-4.9 — Non-Premium Redirect to Billing  
**Actor:** Free user  
**Route:** `/analytics` → `/billing`  
**Flow:**  
Free users attempting to access analytics are redirected to the billing page with an upgrade prompt.[USE_CASE.md]

### UC-4.10 — Backend-Friendly Aggregations  
**Actor:** Premium user  
**Route:** `/analytics`  
**Flow:**  
Instead of loading raw entries, the page calls Supabase RPCs that return aggregated metrics (weekly hours, daily breakdown, project distribution) with caching/revalidation every few minutes to reduce load.[USE_CASE.md]

### UC-4.11 — Analytics Filters  
**Actor:** Premium user  
**Route:** `/analytics`  
**Flow:**  
User can filter analytics by date range (last 7 days, 30 days, custom), project, and entry type; filters are reflected in query parameters so URLs can be shared or bookmarked.[USE_CASE.md]

### UC-4.12 — Analytics Empty States  
**Actor:** Premium user  
**Route:** `/analytics`  
**Flow:**  
If there is not enough data to display charts, an empty state is shown instead of blank charts with text like “Track some time first to see your analytics here” and a CTA to open the extension.[USE_CASE.md]

---

## 5. Promo Codes (User)

### UC-5.1 — Validate a Promo Code  
**Actor:** Authenticated user  
**Endpoint:** `POST /api/promo/validate`  
**Flow:**  
Client submits `{ code }` → server checks active status, date range, max uses, prior redemption by this user → returns `{ valid: true, promo }` or error message.[USE_CASE.md]

### UC-5.2 — Redeem a Promo Code (Full Discount)  
**Actor:** Authenticated user  
**Endpoint:** `POST /api/promo/redeem`  
**Flow:**  
Server calls atomic `redeem_promo()` RPC → increments `current_uses` → grants premium directly → returns `{ success: true }`.[USE_CASE.md]

### UC-5.3 — Redeem a Promo Code (Partial Discount)  
**Actor:** Authenticated user  
**Endpoint:** `POST /api/promo/redeem`  
**Flow:**  
Server calls `redeem_promo()` RPC → creates Stripe coupon with discount % → creates checkout session with coupon applied → returns `{ success: true, checkoutUrl }` → user redirected to discounted checkout.[USE_CASE.md]

### UC-5.4 — User Feedback for Promo Codes  
**Actor:** Authenticated user  
**Route:** `/billing` (promo input)  
**Flow:**  
When validating a code, the UI maps server errors to explicit messages (expired, already used, max uses reached, invalid) and uses colored toasts/inline labels to distinguish success vs failure; client and server both enforce rate limiting to prevent abuse.[USE_CASE.md]

---

## 6. Extension Bridge

### UC-6.1 — Connect Extension After Login  
**Actor:** Extension user  
**Route:** `/auth/callback/extension`  
**Flow:**  
After login with `?ext=true`, ExtensionBridge sends `AUTH_LOGIN` message via `chrome.runtime.sendMessage` with `accessToken` + `refreshToken` + `device_id` → extension stores tokens → bridge shows “Connected!” with “Go to Dashboard” link.[USE_CASE.md]

### UC-6.2 — Handle Extension Not Installed  
**Actor:** User without extension installed  
**Route:** `/auth/callback/extension`  
**Flow:**  
Bridge waits 5 seconds for extension response → timeout → shows “Extension not detected” with links to install extension or continue to dashboard anyway.[USE_CASE.md]

### UC-6.3 — Retry Extension Connection  
**Actor:** Extension user  
**Route:** `/auth/callback/extension`  
**Flow:**  
On “Retry” button click, the page re-sends `chrome.runtime.sendMessage` using the existing Supabase session without forcing the user to log in again; success/failure updates the UI state accordingly.[USE_CASE.md]

### UC-6.4 — Secure Messaging  
**Actor:** Web app + Extension  
**Route:** `/auth/callback/extension`  
**Flow:**  
Bridge validates that incoming messages originate from the expected extension ID and match the expected payload shape before storing tokens; any unexpected messages are ignored and optionally logged.[USE_CASE.md]

---

## 7. Settings

### UC-7.1 — Access Settings Page  
**Actor:** Authenticated user  
**Route:** `/settings`  
**Flow:**  
User clicks “Settings” from sidebar or user menu → navigates to `/settings` with tabs/sections: `Profile`, `Time tracking`, `Appearance`, `Security`, `Sessions`, `Extension sync`.[USE_CASE.md]

### UC-7.2 — Time Tracking Settings (Synced with Extension)  
**Actor:** Authenticated user  
**Route:** `/settings/time-tracking`  
**Flow:**  
User modifies global settings (default work week length, default project, rounding rules, Pomodoro duration, idle detection) → settings saved in a Supabase profile/settings table → the extension fetches these settings periodically or on demand so both web and extension stay in sync.[USE_CASE.md]

### UC-7.3 — Appearance Settings  
**Actor:** Authenticated user  
**Route:** `/settings/appearance`  
**Flow:**  
User selects theme (light/dark/system) and optionally an accent color → preferences stored server-side and applied to the web UI; extension can read the same settings to mirror appearance where possible.[USE_CASE.md]

### UC-7.4 — Security & Sessions  
**Actor:** Authenticated user  
**Route:** `/settings/security` and `/settings/sessions`  
**Flow:**  
User can change password (UC-1.12), toggle re-auth for sensitive actions, and manage active sessions (UC-1.13) from dedicated settings sections.[USE_CASE.md]

---

## 8. Entries

### UC-8.1 — View Entries List  
**Actor:** Authenticated user  
**Route:** `/entries`  
**Flow:**  
User opens `/entries` and sees a paginated/table view of tracked entries (same schema as extension): date, start/end time, duration, project, entry type, notes, source (extension/web) → filters at top allow filtering by date range, project, entry type.[USE_CASE.md]

### UC-8.2 — Edit Entry  
**Actor:** Authenticated user  
**Route:** `/entries/:id/edit` (modal or inline)  
**Flow:**  
User clicks an entry → edit form opens (modal or row expansion) → user can adjust date/time, project, notes, and type → on save, entry is updated in Supabase and analytics recalculated; extension picks up changes on next sync.[USE_CASE.md]

### UC-8.3 — Create Manual Entry from Web  
**Actor:** Authenticated user  
**Route:** `/entries/new` or button on `/entries`  
**Flow:**  
User clicks “Add entry” → enters from/to time, project, notes → server validates overlaps/time sanity → entry is inserted and appears in the table and in extension history on next sync.[USE_CASE.md]

### UC-8.4 — Bulk Edit / Delete Entries  
**Actor:** Authenticated user  
**Route:** `/entries`  
**Flow:**  
User selects multiple entries via checkboxes → can delete them or update shared fields (e.g. project) in bulk → a confirmation dialog appears for destructive actions → analytics are updated accordingly.[USE_CASE.md]

### UC-8.5 — Modern Entries UI  
**Actor:** Authenticated user  
**Route:** `/entries`  
**Flow:**  
Entries table uses a modern, minimal design (sticky header, zebra stripes, chips for entry type, responsive layout) matching the dashboard visual language inspired by the reference screenshots.[file:22][file:23]

---

## 9. Admin — Overview

### UC-9.1 — View Platform Summary  
**Actor:** Admin user  
**Route:** `/admin`  
**Flow:**  
Admin sees stats grid: Total Users, Premium Users, Free Users, Total Hours Tracked; premium breakdown by source (Stripe, Domain, Promo, Manual); conversion rate bar; last 10 sign-ups table.[USE_CASE.md]

---

## 10. Admin — Statistics

### UC-10.1 — View User Engagement Metrics  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Admin sees DAU, WAU, MAU, total users, new users this week (all from Supabase RPC functions, revalidated every 60s).[USE_CASE.md]

### UC-10.2 — View User Growth Chart  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Bar chart showing new user registrations for each of the last 8 weeks.[USE_CASE.md]

### UC-10.3 — View Premium Subscription Breakdown  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Stats split by plan type (Monthly / Yearly / Lifetime) and by source (Stripe / Domain Whitelist / Promo Code / Manual Grant).[USE_CASE.md]

### UC-10.4 — View Platform Usage Stats  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Total hours tracked, total entries, avg session duration, overall conversion rate (free → premium).[USE_CASE.md]

### UC-10.5 — View Content Breakdown  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Entry type distribution (Manual / Stopwatch / Pomodoro), total projects created, avg projects per user, avg entries per day over last 30 days.[USE_CASE.md]

### UC-10.6 — View Top Users by Hours  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Ranked table of users with the most total hours tracked.[USE_CASE.md]

### UC-10.7 — View Promo & Domain Stats  
**Actor:** Admin user  
**Route:** `/admin/stats`  
**Flow:**  
Count of active promo codes, whitelisted domains, and manual premium grants.[USE_CASE.md]

---

## 11. Admin — User Management

### UC-11.1 — Browse All Users  
**Actor:** Admin user  
**Route:** `/admin/users`  
**Flow:**  
Paginated table (15 users/page) showing email, display name, role, join date, plan, subscription status. Sorted by newest first.[USE_CASE.md]

### UC-11.2 — Search Users  
**Actor:** Admin user  
**Route:** `/admin/users?search=...`  
**Flow:**  
Admin enters partial email → page filters results to matching users; additional filters allow searching by plan and status (active / canceled / past_due); filters are reflected in query parameters.[USE_CASE.md]

### UC-11.3 — Paginate User List  
**Actor:** Admin user  
**Route:** `/admin/users?page=N`  
**Flow:**  
Admin clicks next/previous → page offset changes → next 15 users loaded.[USE_CASE.md]

### UC-11.4 — Per-User Quick Actions  
**Actor:** Admin user  
**Route:** `/admin/users`  
**Flow:**  
Each row exposes actions such as “View subscriptions” (`/admin/subscriptions?user=...`) and “Open analytics” (if a per-user analytics view exists).[USE_CASE.md]

---

## 12. Admin — Domain Whitelist

### UC-12.1 — Add Whitelisted Domain  
**Actor:** Admin user  
**Route:** `/admin/domains` → `POST /api/admin/domains`  
**Flow:**  
Admin enters domain (e.g. `company.com`) and selects a plan (monthly/yearly/lifetime) → validated via regex → inserted as active → any user whose email matches the domain automatically receives that plan.[USE_CASE.md]

### UC-12.2 — Deactivate a Domain  
**Actor:** Admin user  
**Route:** `/admin/domains` → `PATCH /api/admin/domains`  
**Flow:**  
Admin clicks “Deactivate” → confirmation dialog shown → admin confirms → domain marked inactive → new matching users no longer receive premium from it.[USE_CASE.md]

### UC-12.3 — Reactivate a Domain  
**Actor:** Admin user  
**Route:** `/admin/domains` → `PATCH /api/admin/domains`  
**Flow:**  
Admin clicks “Activate” on an inactive domain → domain marked active again.[USE_CASE.md]

### UC-12.4 — View All Whitelisted Domains  
**Actor:** Admin user  
**Route:** `/admin/domains`  
**Flow:**  
Admin sees table of all domains with: domain name, plan, active/inactive status, created date, and action buttons, plus per-domain stats (number of users using this domain, last usage date).[USE_CASE.md]

---

## 13. Admin — Promo Code Management

### UC-13.1 — Create a Promo Code  
**Actor:** Admin user  
**Route:** `/admin/promos` → `POST /api/admin/promos`  
**Flow:**  
Admin fills form: code (3-50 chars), discount % (1-100), plan, optional max uses → server normalizes code (e.g. uppercase) and checks uniqueness → validated → inserted as active with `current_uses: 0` and `valid_from: now()`.[USE_CASE.md]

### UC-13.2 — Deactivate a Promo Code  
**Actor:** Admin user  
**Route:** `/admin/promos` → `PATCH /api/admin/promos`  
**Flow:**  
Admin clicks “Deactivate” → confirmation → promo marked inactive → can no longer be redeemed by users.[USE_CASE.md]

### UC-13.3 — Reactivate a Promo Code  
**Actor:** Admin user  
**Route:** `/admin/promos` → `PATCH /api/admin/promos`  
**Flow:**  
Admin clicks “Activate” on inactive promo → promo marked active again.[USE_CASE.md]

### UC-13.4 — Monitor Promo Code Usage  
**Actor:** Admin user  
**Route:** `/admin/promos`  
**Flow:**  
Admin views table showing each code's `current_uses` vs `max_uses` and current status, optionally rendered with a progress bar or color-coded badge when near exhaustion.[USE_CASE.md]

---

## 14. Admin — Manual Premium Grant

### UC-14.1 — Grant Premium to User by Email  
**Actor:** Admin user  
**Route:** `/admin/subscriptions` → `POST /api/admin/subscriptions`  
**Flow:**  
Admin enters user email, selects plan, optionally sets end date and reason → server looks up user via `auth.admin.listUsers()` → if found, upserts subscription with `granted_by: 'admin_manual'` and `granted_reason` → user immediately has premium.[USE_CASE.md]

### UC-14.2 — View All Subscriptions  
**Actor:** Admin user  
**Route:** `/admin/subscriptions`  
**Flow:**  
Admin sees table of all subscriptions with user email, plan, status, source (`stripe` / `domain` / `promo` / `admin_manual`), and period end date, plus ability to terminate or downgrade manual grants.[USE_CASE.md]

---

## 15. Stripe Webhooks

### UC-15.1 — Handle Successful Checkout  
**Trigger:** `checkout.session.completed` webhook from Stripe  
**Endpoint:** `POST /api/webhooks/stripe`  
**Flow:**  
Stripe sends event → signature verified → idempotency check (rejects duplicate `event_id`) → subscription upserted with plan, Stripe customer ID, subscription ID, `status: 'active'`, `granted_by: 'stripe'`.[USE_CASE.md]

### UC-15.2 — Handle Subscription Renewal / Update  
**Trigger:** `customer.subscription.updated` webhook  
**Endpoint:** `POST /api/webhooks/stripe`  
**Flow:**  
Subscription record updated: plan, status, `current_period_end` (from `items.data[0]`), `cancel_at_period_end` flag.[USE_CASE.md]

### UC-15.3 — Handle Subscription Cancellation  
**Trigger:** `customer.subscription.deleted` webhook  
**Endpoint:** `POST /api/webhooks/stripe`  
**Flow:**  
Subscription downgraded to `plan: 'free'`, `status: 'canceled'`.[USE_CASE.md]

### UC-15.4 — Handle Failed Payment  
**Trigger:** `invoice.payment_failed` webhook  
**Endpoint:** `POST /api/webhooks/stripe`  
**Flow:**  
Subscription status set to `'past_due'` → user retains access until Stripe gives up retrying → app may show warnings and emails prompting user to update payment method.[USE_CASE.md]

### UC-15.5 — Webhook Event Log & Errors  
**Trigger:** Any Stripe webhook event  
**Endpoint:** `POST /api/webhooks/stripe`  
**Flow:**  
Event persisted in `stripe_events` table with `event_id`, payload snapshot, and `processed_at` → handler skips processing if `event_id` already exists → failures are logged with error details and surfaced in admin stats.[USE_CASE.md]

---

## 16. Navigation & UI

### UC-16.1 — Toggle Dark/Light Theme  
**Actor:** Any visitor  
**Component:** `ThemeToggle` in Navbar  
**Flow:**  
User clicks toggle → theme class flipped (`dark` / `light`) on `<html>` → cookie or setting saved for persistence → dark mode applied via CSS.[USE_CASE.md]

### UC-16.2 — Navigate Between Dashboard, Analytics, Billing, Entries  
**Actor:** Authenticated user  
**Component:** Navbar / Sidebar  
**Flow:**  
User clicks nav link → Next.js client-side navigation → page renders; active link is highlighted using a distinct style (color, underline, or background).[USE_CASE.md]

### UC-16.3 — Access Admin Panel  
**Actor:** Admin user  
**Component:** Navbar (user menu shows “Admin” link if `role === 'admin'`)  
**Flow:**  
Admin clicks link → navigates to `/admin` → admin layout guard confirms role.[USE_CASE.md]

### UC-16.4 — View Toast Notifications  
**Actor:** Any user  
**Component:** Sonner `<Toaster>` (bottom-right)  
**Flow:**  
Any API error or success triggers a toast notification with descriptive message; toast variants (success/error/info) are standardized across the app.[USE_CASE.md]

### UC-16.5 — Mobile Navigation  
**Actor:** Mobile user  
**Component:** Navbar (hamburger + drawer)  
**Flow:**  
User taps hamburger → slide-in drawer with all nav links and theme toggle appears → tap link → navigates and drawer closes.[USE_CASE.md]

### UC-16.6 — Global Layout & Page Transitions  
**Actor:** Any authenticated user  
**Component:** App shell  
**Flow:**  
App uses a shared layout with top bar + sidebar + content; page transitions use subtle fade/slide animations to feel smooth when switching between dashboard, analytics, entries, and settings.[file:22][file:23]
