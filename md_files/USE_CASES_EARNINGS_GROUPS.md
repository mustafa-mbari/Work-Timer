# Work-Timer Web App — Use Cases: Earnings & Groups

> Use cases for the Project Hourly Pricing / Earnings feature and the All-In Group Sharing feature.
> Last updated: 2026-02-21

---

## Table of Contents

1. [Project Hourly Pricing](#1-project-hourly-pricing)
2. [Earnings Reports](#2-earnings-reports)
3. [Earnings Settings](#3-earnings-settings)
4. [All-In Subscription](#4-all-in-subscription)
5. [Groups — Creation & Management](#5-groups--creation--management)
6. [Groups — Invitations](#6-groups--invitations)
7. [Groups — Join by Code](#7-groups--join-by-code)
8. [Groups — Member Management](#8-groups--member-management)
9. [Admin — Group Management](#9-admin--group-management)
10. [Stripe Webhooks — All-In Plans](#10-stripe-webhooks--all-in-plans)

---

## 1. Project Hourly Pricing

### UC-E1.1 — Set Per-Project Hourly Rate (Dashboard)
**Actor:** Authenticated user
**Route:** `/dashboard` (Projects card)
**Flow:** User clicks the edit (pencil) icon on a project → inline edit row expands with name, color picker, and a new "Rate/hr" input → user enters a rate (e.g. `75`) → clicks save → `PUT /api/projects/[id]` sends `{ hourly_rate: 75 }` → project card shows rate badge (e.g. "USD 75/hr" in emerald text).

### UC-E1.2 — Clear Per-Project Hourly Rate
**Actor:** Authenticated user
**Route:** `/dashboard` (Projects card)
**Flow:** User edits a project → clears the rate field (empty) → saves → rate is stored as `null` → earnings calculation falls back to the default hourly rate from user settings.

### UC-E1.3 — Rate Fallback Logic
**Precondition:** User has `default_hourly_rate` set in settings.
**Flow:** For a project with `hourly_rate = null`, the earnings RPC uses `COALESCE(project.hourly_rate, user_settings.default_hourly_rate, 0)`. If both are null, earnings for that project are $0.

---

## 2. Earnings Reports

### UC-E2.1 — View Earnings Report (Premium)
**Actor:** Premium user
**Route:** `/earnings`
**Flow:** Server fetches `get_earnings_report` RPC for the user → page renders four summary cards (Grand Total, Avg Rate, Total Hours, Total Projects) + a table of projects with columns: Project, Hours, Rate, Total. A grand total row appears at the bottom in emerald accent.

### UC-E2.2 — View Earnings Report (Free — Blurred Preview)
**Actor:** Free user
**Route:** `/earnings`
**Flow:** Server detects non-premium status → renders a blurred/locked preview with an "Upgrade to Premium" prompt and a link to `/billing`. No real earnings data is exposed.

### UC-E2.3 — Filter Earnings by Date Range
**Actor:** Premium user
**Route:** `/earnings?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
**Flow:** User selects a preset (Week, Month, Quarter, Year) or manually enters From/To dates in the filter bar → URL updates → server re-fetches earnings RPC with date params → summary cards and table update to the filtered range.

### UC-E2.4 — Export Earnings as CSV
**Actor:** Premium user
**Route:** `/earnings`
**Flow:** User clicks "Export CSV" button → client-side code formats current earnings data (project name, hours, rate, total) into CSV text → triggers browser download as `earnings_<from>_<to>.csv` (or `earnings_all.csv` if no filter).

### UC-E2.5 — Earnings with No Rates Configured
**Actor:** Premium user
**Route:** `/earnings`
**Flow:** User has no `default_hourly_rate` and no per-project `hourly_rate` → earnings report shows $0.00 totals for all projects → no error.

---

## 3. Earnings Settings

### UC-E3.1 — Set Default Hourly Rate
**Actor:** Authenticated user
**Route:** `/settings?tab=earnings`
**Flow:** User navigates to Settings → clicks "Earnings" tab → enters a default hourly rate (e.g. `50`) → clicks "Save" → `PUT /api/settings` sends `{ default_hourly_rate: 50 }` → toast "Settings saved".

### UC-E3.2 — Set Currency
**Actor:** Authenticated user
**Route:** `/settings?tab=earnings`
**Flow:** User selects a currency from the dropdown (USD, EUR, GBP, CAD, AUD, JPY, CHF, INR, BRL, SEK) → clicks "Save" → `PUT /api/settings` sends `{ currency: "EUR" }` → earnings page and project card display update accordingly.

### UC-E3.3 — Clear Default Hourly Rate
**Actor:** Authenticated user
**Route:** `/settings?tab=earnings`
**Flow:** User clears the default hourly rate field → saves → `default_hourly_rate` stored as `null` → only per-project rates (if set) are used for earnings.

---

## 4. All-In Subscription

### UC-A4.1 — Upgrade to All-In Monthly ($29.99/mo)
**Actor:** Free or Premium user
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout
**Flow:** User scrolls to the "All-In Plans" section → clicks "Upgrade to All-In Monthly" → API creates Stripe Checkout session in subscription mode with `allin_monthly` price → user completes payment → webhook sets `plan: 'allin_monthly', status: 'active'` → user gains access to Groups + Earnings.

### UC-A4.2 — Upgrade to All-In Yearly ($299/yr)
**Actor:** Free or Premium user
**Route:** `/billing` → `POST /api/checkout` → Stripe Checkout
**Flow:** Same as UC-A4.1 with `allin_yearly` price. Saves 17% vs monthly.

### UC-A4.3 — All-In Plan Includes All Premium Features
**Precondition:** User has an active `allin_monthly` or `allin_yearly` subscription.
**Flow:** `isPremiumUser()` returns `true` for all-in plans (all premium checks pass). `isAllInUser()` additionally returns `true`, unlocking Groups and Earnings features.

### UC-A4.4 — View All-In Plan in Active Banner
**Actor:** All-In user
**Route:** `/billing`
**Flow:** Active plan banner at top shows "All-In Monthly" or "All-In Yearly" with renewal date and "Manage Subscription" portal button.

---

## 5. Groups — Creation & Management

### UC-G5.1 — View Groups Page (All-In)
**Actor:** All-In user
**Route:** `/groups`
**Flow:** Server verifies `isAllInUser()` → fetches user's groups + pending invitations → renders GroupsView with "My Groups" and "Invitations" tabs.

### UC-G5.2 — View Groups Page (Non-All-In)
**Actor:** Free or Premium user (not All-In)
**Route:** `/groups`
**Flow:** Server detects non-all-in status → renders upgrade prompt with team icon and "Upgrade to All-In" button linking to `/billing`.

### UC-G5.3 — Create a Group
**Actor:** All-In user
**Route:** `/groups` → `POST /api/groups`
**Flow:** User clicks "Create Group" → dialog with group name input → submits → API verifies all-in subscription + creates group → user is added as `admin` member → group card appears with join code.

### UC-G5.4 — Delete a Group
**Actor:** Group owner (All-In user)
**Route:** `/groups` → `DELETE /api/groups/[id]`
**Flow:** User expands group detail → clicks "Delete Group" → API verifies ownership → group, members, and invitations cascade-deleted → group card removed.

### UC-G5.5 — View Group Detail (Inline Expand)
**Actor:** Group member (All-In user)
**Route:** `/groups`
**Flow:** User clicks a group card → card expands inline to show members list, invite form (admin only), join code, and admin actions.

### UC-G5.6 — Copy Join Code
**Actor:** Group admin
**Route:** `/groups`
**Flow:** User clicks the copy icon next to the join code → code copied to clipboard → toast "Join code copied".

---

## 6. Groups — Invitations

### UC-G6.1 — Invite Member by Email
**Actor:** Group admin
**Route:** `/groups` (group detail) → `POST /api/groups/[id]/members`
**Flow:** Admin enters email in invite input → clicks "Invite" → API verifies admin role + group not at max capacity → creates pending invitation with 7-day expiry → toast "Invitation sent to [email]".

### UC-G6.2 — View Pending Invitations
**Actor:** Authenticated user
**Route:** `/groups` → "Invitations" tab
**Flow:** User switches to Invitations tab → sees pending invitations showing group name + expiry date + Accept/Decline buttons.

### UC-G6.3 — Accept Invitation
**Actor:** Invited user (All-In user)
**Route:** `/groups` → `POST /api/groups/invitations`
**Flow:** User clicks "Accept" → API marks invitation as accepted + adds user to `group_members` → invitation card removed → group appears in "My Groups" tab.

### UC-G6.4 — Decline Invitation
**Actor:** Invited user
**Route:** `/groups` → `POST /api/groups/invitations`
**Flow:** User clicks "Decline" → API marks invitation as declined → invitation card removed.

### UC-G6.5 — Invitation Capacity Check
**Precondition:** Group has reached `max_members`.
**Flow:** Admin tries to invite → API returns 400 "Group is at maximum capacity" → toast error shown.

---

## 7. Groups — Join by Code

### UC-G7.1 — Join Group via Code
**Actor:** All-In user
**Route:** `/groups` → `POST /api/groups/join`
**Flow:** User clicks "Join" → dialog with code input → enters join code → API verifies all-in subscription + valid code + group not full → adds user as member → toast "Joined [group name]" → groups list refreshed.

### UC-G7.2 — Join with Invalid Code
**Actor:** All-In user
**Route:** `/groups` → `POST /api/groups/join`
**Flow:** User enters invalid code → API returns 404 "Invalid join code" → toast error.

### UC-G7.3 — Join When Already a Member
**Actor:** All-In user who is already in the group
**Route:** `/groups` → `POST /api/groups/join`
**Flow:** API detects unique constraint violation → returns 400 "You are already a member of this group" → toast error.

### UC-G7.4 — Join When Group is Full
**Actor:** All-In user
**Route:** `/groups` → `POST /api/groups/join`
**Flow:** Group has reached `max_members` → API returns 400 "Group is at maximum capacity" → toast error.

### UC-G7.5 — Join Without All-In Subscription
**Actor:** Free or Premium user
**Route:** `/groups` → `POST /api/groups/join`
**Flow:** API verifies subscription → returns 403 "All-In subscription required to join groups" → toast error.

---

## 8. Groups — Member Management

### UC-G8.1 — View Group Members
**Actor:** Group member
**Route:** `/groups` (group detail)
**Flow:** User expands group → members listed with avatar initial, name/email, role badge (admin/member).

### UC-G8.2 — Promote Member to Admin
**Actor:** Group admin
**Route:** `/groups` → `PATCH /api/groups/[id]/members/[userId]`
**Flow:** Admin clicks role toggle on a member → API updates role to `admin` → badge updates → toast "Role updated".

### UC-G8.3 — Demote Admin to Member
**Actor:** Group admin
**Route:** `/groups` → `PATCH /api/groups/[id]/members/[userId]`
**Flow:** Admin clicks role toggle on another admin → API updates role to `member` → badge updates.

### UC-G8.4 — Remove a Member
**Actor:** Group admin
**Route:** `/groups` → `DELETE /api/groups/[id]/members?userId=...`
**Flow:** Admin clicks trash icon on a member → API verifies admin role + target is not the owner → member removed → member list updates.

### UC-G8.5 — Cannot Remove Group Owner
**Actor:** Group admin
**Route:** `/groups` → `DELETE /api/groups/[id]/members?userId=...`
**Flow:** API detects target is the `owner_id` → returns 400 "Owner cannot be removed. Delete the group instead." → toast error.

### UC-G8.6 — Leave a Group (Self-Remove)
**Actor:** Group member (non-owner)
**Route:** `/groups` → `DELETE /api/groups/[id]/members?userId=self`
**Flow:** Non-admin member can only remove themselves → member removed → group no longer appears in "My Groups".

---

## 9. Admin — Group Management

### UC-A9.1 — View All Groups
**Actor:** Admin user
**Route:** `/admin/groups`
**Flow:** Admin navigates to admin panel → "Groups" tab → sees table of all groups with: Name, Owner email, Members count, Max Members, Join Code, Created date.

### UC-A9.2 — Edit Group Max Members
**Actor:** Admin user
**Route:** `/admin/groups` → `PATCH /api/admin/groups`
**Flow:** Admin changes the max members input for a group → clicks "Save" → API calls `admin_update_group` RPC → max updated → toast "Max members updated".

### UC-A9.3 — Admin Groups Navigation
**Actor:** Admin user
**Route:** `/admin/groups`
**Flow:** "Groups" tab appears in the admin navigation bar with a `UsersRound` icon.

---

## 10. Stripe Webhooks — All-In Plans

### UC-W10.1 — Handle All-In Checkout Completed
**Trigger:** `checkout.session.completed` with `metadata.plan = 'allin_monthly'` or `'allin_yearly'`
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** `resolveCheckoutPlan()` maps to `'allin_monthly'` or `'allin_yearly'` → subscription upserted with all-in plan + `granted_by: 'stripe'`.

### UC-W10.2 — Handle All-In Subscription Updated
**Trigger:** `customer.subscription.updated` with all-in price ID
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** `PLAN_MAP` recognizes all-in price IDs → subscription record updated with correct plan, status, and period end.

### UC-W10.3 — Handle All-In Subscription Canceled
**Trigger:** `customer.subscription.deleted` for an all-in subscription
**Endpoint:** `POST /api/webhooks/stripe`
**Flow:** Same as premium cancellation → plan set to `'free'`, status `'canceled'` → user loses access to groups and earnings.

---

## API Endpoint Summary (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/groups` | All-In | List user's groups |
| `POST` | `/api/groups` | All-In | Create a new group |
| `GET` | `/api/groups/[id]` | Member | Get group details + members |
| `PATCH` | `/api/groups/[id]` | Owner | Update group name |
| `DELETE` | `/api/groups/[id]` | Owner | Delete group |
| `POST` | `/api/groups/[id]/members` | Admin | Invite member by email |
| `DELETE` | `/api/groups/[id]/members` | Admin/Self | Remove a member |
| `PATCH` | `/api/groups/[id]/members/[userId]` | Admin | Update member role |
| `POST` | `/api/groups/join` | All-In | Join group by code |
| `GET` | `/api/groups/invitations` | User | List pending invitations |
| `POST` | `/api/groups/invitations` | User | Accept or decline invitation |
| `PATCH` | `/api/admin/groups` | Admin | Update group max members |

---

## Actor Summary (Updated)

| Actor | Access Level | New Capabilities |
|-------|-------------|-----------------|
| **Premium user** | Authenticated + premium sub | Earnings reports, per-project hourly rates |
| **All-In user** | Authenticated + all-in sub | Everything in Premium + Groups, shared data, group analytics |
| **Group admin** | All-In + admin role in group | Invite/remove members, promote/demote roles, see join code |
| **Group member** | All-In + member of group | View group members, leave group |
| **Admin user** | `role: 'admin'` | Manage all groups, edit max members |

---

## Database Tables (New)

| Table | Purpose |
|-------|---------|
| `groups` | Team groups with owner, join code, max members |
| `group_members` | Group membership (user_id + group_id + role) |
| `group_invitations` | Pending email invitations with 7-day expiry |

## Database Columns (Modified)

| Table | Column | Change |
|-------|--------|--------|
| `projects` | `hourly_rate` | Added — per-project hourly rate (nullable) |
| `user_settings` | `default_hourly_rate` | Added — fallback rate for projects without one |
| `user_settings` | `currency` | Added — display currency (default: USD) |
| `subscriptions` | `group_id` | Added — optional link to a group |

## RPC Functions (New)

| Function | Purpose |
|----------|---------|
| `get_earnings_report` | Calculate per-project earnings with rate fallback |
| `get_group_analytics` | Aggregate time data across all group members |
| `admin_get_groups` | List all groups with metadata for admin panel |
| `admin_update_group` | Update max_members for a group |
