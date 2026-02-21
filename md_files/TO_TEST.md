# Testing Checklist

Track manual verification of each phase before merging to production.
Mark items with `[x]` as you test them, or add notes if something fails.

---

## Phase 1 — Authentication Hardening

### Task 1.1 — Forgot Password Flow

**Setup:** Make sure you have a test account with a known email address.

- [ ] Navigate to `/login` → confirm "Forgot password?" link appears inline with the Password label
- [ ] Click "Forgot password?" → confirm you land on `/forgot-password`
- [ ] Submit a **valid** email address → confirm "Check your inbox" success state appears (email + 1hr note)
- [ ] Confirm you receive the Supabase password reset email in your inbox
- [ ] Click the reset link in the email → confirm you land on `/reset-password` (not "Link expired")
- [ ] Submit **mismatched** passwords → confirm "Passwords do not match" inline error appears
- [ ] Submit a password shorter than 8 characters → confirm "at least 8 characters" error
- [ ] Submit a valid new password → confirm redirect to `/login?message=password-updated`
- [ ] Confirm the green success banner "Password updated successfully" shows on the login page
- [ ] Sign in with the **new** password → confirm it works
- [ ] Sign in with the **old** password → confirm it fails

**Edge cases:**
- [ ] Submit a **non-existent** email on `/forgot-password` → confirm success state still shows (Supabase doesn't reveal if email exists — this is correct behavior)
- [ ] Visit `/reset-password` directly (no reset link, no session) → confirm "Link expired or invalid" state with "Request a new link" button
- [ ] Click "Request a new link" on the invalid state → confirm redirect to `/forgot-password`
- [ ] Click "try again" on the success state → confirm form resets so user can submit again

---

### Task 1.2 — Email Verification Enforcement

**Setup:** Create a **new** test account via email/password (do NOT click the verification link yet).

- [ ] After registration → confirm redirect to `/verify-email?email=your@email.com`
- [ ] Confirm the page shows the correct email address
- [ ] Click "Resend verification email" → confirm toast "Verification email sent!"
- [ ] Check your email → confirm a verification email was received
- [ ] **Without verifying**: try accessing `/dashboard` directly → confirm redirect to `/verify-email`
- [ ] **Without verifying**: try accessing `/analytics` directly → confirm redirect to `/verify-email`
- [ ] **Without verifying**: try accessing `/billing` directly → confirm redirect to `/verify-email`
- [ ] Click the verification link in the email → confirm login / redirect to dashboard
- [ ] **After verifying**: access `/dashboard` → confirm it loads normally (no more redirect)

**OAuth users (should NOT be gated):**
- [ ] Sign in with Google → confirm you reach `/dashboard` directly (no `/verify-email` redirect)

**Edge cases:**
- [ ] Visit `/verify-email` with no `?email=` param → confirm "Resend" button is disabled
- [ ] Click "Used the wrong email? Start over" → confirm redirect to `/register`

---

### Task 1.3 — Rate Limiting Feedback

**Note:** Supabase rate limits kick in after several rapid attempts. You may need to trigger real rate limits or inspect the error handling logic by temporarily simulating a 429 response.

- [ ] On `/login` (Password tab): submit 10+ rapid failed login attempts → confirm rate-limit message "Too many login attempts. Please wait a moment and try again." appears (not the raw Supabase error)
- [ ] On `/login` (Magic Link tab): send 5+ rapid magic link requests → confirm rate-limit message appears
- [ ] On `/register`: attempt 5+ rapid registrations → confirm rate-limit message appears
- [ ] On `/forgot-password`: submit 5+ rapid reset requests → confirm rate-limit message appears
- [ ] On `/verify-email`: click "Resend" 5+ times rapidly → confirm rate-limit toast appears

---

### Phase 1 — General UI Checks

- [ ] All new pages (`/forgot-password`, `/reset-password`, `/verify-email`) render correctly in **light mode**
- [ ] All new pages render correctly in **dark mode**
- [ ] All new pages are responsive at **375px** mobile width
- [ ] Password strength indicator shows **Weak** (red) for short passwords (< 6 chars)
- [ ] Password strength indicator shows **Fair** (amber) for medium passwords (6–7 chars)
- [ ] Password strength indicator shows **Strong** (green) for passwords ≥ 8 chars
- [ ] All form inputs have correct `autocomplete` attributes (email, new-password)
- [ ] Tab order and keyboard navigation work on all new forms

---

## Phase 2 — Settings Pages

### Navigation — Settings Entry Points

- [ ] Navbar: confirm "Settings" link appears between Billing and user menu (authenticated only)
- [ ] Mobile menu: confirm "Settings" appears in the authenticated links list
- [ ] User menu dropdown: confirm "Settings" item appears before "Sign out"
- [ ] All three entry points navigate to `/settings`

### Settings Page Shell

- [ ] Navigate to `/settings` → confirm the page loads with 5 tabs: Profile, Time Tracking, Appearance, Security, Sessions & Devices
- [ ] Default tab is "Profile"
- [ ] Click each tab → confirm URL updates to `?tab=<id>` and correct content renders
- [ ] Refresh page on a non-default tab → confirm the correct tab is still active (URL param preserved)
- [ ] Loading skeleton renders during SSR hydration
- [ ] Page is responsive at 375px mobile width (tabs scroll horizontally if needed)
- [ ] Light mode and dark mode render correctly across all tabs

---

### Task 2.3 — Profile Tab

**Setup:** Sign in with a test account.

- [ ] Profile tab shows the user's current email (read-only)
- [ ] Profile tab shows the current subscription plan badge (Free / Premium)
- [ ] Avatar shows initials derived from display name (if set) or email
- [ ] Display name field is pre-filled if one exists
- [ ] Change the display name → click "Save changes" → confirm toast "Profile saved"
- [ ] Refresh the page → confirm new display name persists
- [ ] Clear display name (empty field) → save → confirm null is accepted (no validation error)
- [ ] Display name > 100 chars → confirm validation error or truncation

---

### Task 2.4 — Time Tracking Tab

- [ ] All fields load with current saved values (or sensible defaults on first visit)
- [ ] **Working days**: change from 5 to 3 → save → refresh → confirm persists
- [ ] **Week starts on**: toggle between Monday/Sunday → save → refresh → confirm persists
- [ ] **Daily target**: set to 8 → save → refresh → confirm persists
- [ ] **Weekly target**: set to 40 → save → refresh → confirm persists
- [ ] **Daily/weekly target**: clear field → save → confirm null accepted (no required error)
- [ ] **Idle timeout**: change to 15 minutes → save → refresh → confirm persists
- [ ] **Auto-show floating timer**: toggle on → save → refresh → confirm persists
- [ ] **Pomodoro — Work session**: change to 45 → save → refresh → confirm persists
- [ ] **Pomodoro — Short break**: change to 10 → save → refresh → confirm persists
- [ ] **Pomodoro — Long break**: change to 20 → save → refresh → confirm persists
- [ ] **Pomodoro — Sessions before long break**: change to 3 → save → refresh → confirm persists
- [ ] **Pomodoro — Sound notifications**: toggle off → save → refresh → confirm persists
- [ ] **Reminder — Enable**: toggle on → confirm Day / Hour / Minute fields appear
- [ ] **Reminder — Enable**: toggle off → confirm sub-fields disappear
- [ ] **Reminder**: set to Wednesday 09:30 → save → refresh → confirm persists
- [ ] Submit with invalid pomodoro values (e.g. 0 minutes) → confirm validation error (min=1)
- [ ] Toast "Settings saved" appears on successful save

---

### Task 2.5 — Appearance Tab

- [ ] Active theme option is highlighted with indigo border
- [ ] Click "Light" → page switches to light mode instantly (no page reload)
- [ ] Click "Dark" → page switches to dark mode instantly
- [ ] Click "System" → page follows OS dark mode preference
- [ ] Click "Save to extension" → toast "Appearance saved"
- [ ] Verify the theme choice persists after page refresh (cookie-backed)

---

### Task 2.6 — Security Tab

**Setup:** Use an email/password account (not OAuth-only).

- [ ] All three password fields start empty
- [ ] Submit with empty "Current password" → confirm error
- [ ] Submit with wrong "Current password" → confirm "Current password is incorrect" error
- [ ] Submit with mismatched new passwords → confirm "Passwords do not match" error
- [ ] Submit with new password < 8 chars → confirm "at least 8 characters" error
- [ ] Password strength indicator reacts as you type the new password
- [ ] Submit with correct current password + valid new password → confirm "Password updated" success state
- [ ] Sign in with the new password → confirm it works

---

### Task 2.7 — Sessions & Devices Tab

**Setup:** Ensure the extension is installed and synced to your account (requires Premium).

- [ ] **With no devices**: empty state shows Monitor icon + "No devices connected" message
- [ ] **With devices**: each connected device shows "Chrome Extension" + partial device ID + last synced date
- [ ] Click the trash icon on a device → confirm it disappears immediately (optimistic)
- [ ] If the DELETE request fails (network off) → confirm the device is restored and an error toast appears
- [ ] After disconnecting a device, refresh → confirm it no longer appears
- [ ] Tip card at the bottom renders correctly

---

### Phase 2 — API Sanity Checks

- [ ] `GET /api/settings` returns 200 + current settings JSON (or empty object for new user)
- [ ] `PUT /api/settings` with valid body → returns 200
- [ ] `PUT /api/settings` with invalid body (e.g. `working_days: 999`) → returns 400
- [ ] `PATCH /api/profile` with `{ displayName: "Test" }` → returns 200
- [ ] `GET /api/devices` returns 200 + array of cursors
- [ ] `DELETE /api/devices` with valid `device_id` → returns 200
- [ ] `DELETE /api/devices` with missing `device_id` → returns 400
- [ ] All settings API routes return 401 when called without authentication

---

## Phase 3 — Entries Page

### Navigation — Entries Entry Points

- [ ] Navbar: confirm "Entries" link appears between Analytics and Billing (authenticated only)
- [ ] Mobile menu: confirm "Entries" appears between Analytics and Billing
- [ ] Both entry points navigate to `/entries`

---

### Task 3.3 — Entries Page Shell (Premium gate)

**Setup:** Sign in with a **free** account first, then with a premium account.

- [ ] **Free user**: navigate to `/entries` → confirm redirect to `/billing`
- [ ] **Premium user**: navigate to `/entries` → confirm page loads with heading "Time Entries"
- [ ] Entry count shows correct total (e.g. "42 entries total")
- [ ] Loading skeleton renders during navigation
- [ ] Page is responsive at 375px mobile width (table scrolls horizontally)
- [ ] Light mode and dark mode render correctly

---

### Task 3.3 — Entry Filters

- [ ] Date "From" field: set a date → table updates to show only entries on or after that date
- [ ] Date "To" field: set a date → table updates to show only entries on or before that date
- [ ] Date range combined: set From + To → confirm entries are within range
- [ ] Project dropdown: select a project → confirm only entries for that project appear
- [ ] Type dropdown: select "Manual" / "Stopwatch" / "Pomodoro" → confirm filter works
- [ ] Multiple filters combined → confirm results match all active filters
- [ ] "Clear" button appears when any filter is active → click it → all filters reset
- [ ] Filter indicator row shows active filter summary
- [ ] Changing any filter resets pagination to page 1

---

### Task 3.3 — Entries Table

- [ ] Table shows columns: Date, Time, Duration, Project, Description, Type, Actions
- [ ] Date displays in "Jan 15, 2025" format
- [ ] Time range displays as "09:30 – 11:45"
- [ ] Duration displays as "2h 15m" or "45m" format
- [ ] Project column shows colored dot + project name (or "—" if none)
- [ ] Description is truncated if long (title attribute shows full text on hover)
- [ ] Tags show as small chips below description (max 3 visible, "+N more" for extras)
- [ ] Type badge: Manual (gray), Stopwatch (indigo), Pomodoro (rose)
- [ ] Alternating row background (zebra stripes)

---

### Task 3.3 — Empty State

- [ ] No entries + no filters: shows "No entries found" with hint about extension + "Add manually" button
- [ ] No entries + active filters: shows "No entries found" + "Try adjusting your filters"
- [ ] "Add manually" button in empty state opens the Add Entry dialog

---

### Task 3.3 — Pagination

- [ ] Page controls appear only when there are > 50 entries
- [ ] "Page X of Y · N entries" counter is accurate
- [ ] Prev / Next buttons navigate correctly
- [ ] Page number buttons highlight current page
- [ ] Prev is disabled on page 1; Next is disabled on last page

---

### Task 3.4 — Add Entry Dialog

- [ ] Click "Add Entry" button → dialog opens with today's date pre-filled
- [ ] Date, Start time, End time fields are required — submit empty → validation errors appear
- [ ] End time before start time → "End time must be after start time" error
- [ ] Duration auto-calculates as start/end change (shown as "Duration: 2h 15m")
- [ ] Type select defaults to "Manual"
- [ ] Project dropdown lists all synced projects
- [ ] Description field accepts up to 1000 characters
- [ ] Tags field: enter "design, meeting" → saved as two separate tags
- [ ] Link field: accepts a valid URL
- [ ] Submit valid form → toast "Entry created" → dialog closes → new entry appears in table
- [ ] Cancel button closes the dialog without creating

---

### Task 3.4 — Edit Entry Dialog

- [ ] Click the pencil icon on an entry → dialog opens pre-filled with that entry's data
- [ ] Edit the description → save → toast "Entry updated" → table shows new description
- [ ] Edit project → save → table shows new project
- [ ] Edit date/time → save → entry re-sorts correctly after page refresh
- [ ] Cancel button closes without saving changes

---

### Task 3.5 — Bulk Operations

- [ ] Checkbox column appears on each row + "select all" header checkbox
- [ ] Select 1 entry → blue selection bar appears at top: "1 selected"
- [ ] Select all → "X selected" count matches entry count on current page
- [ ] Clicking "select all" when all are selected → deselects all
- [ ] "Deselect all" button in selection bar clears selection
- [ ] Click "Delete N" in selection bar → AlertDialog confirmation appears
- [ ] Confirm deletion → entries disappear, toast "N entries deleted", selection clears
- [ ] Cancel deletion → entries remain, selection preserved

---

### Phase 3 — API Sanity Checks

- [ ] `GET /api/entries` returns 200 + `{ data, total, page, pageSize, totalPages }` shape
- [ ] `GET /api/entries?dateFrom=2025-01-01&dateTo=2025-01-31` returns filtered results
- [ ] `GET /api/entries?projectId=<id>` returns project-filtered results
- [ ] `GET /api/entries?type=manual` returns type-filtered results
- [ ] `POST /api/entries` with valid body → returns 201 + `{ success: true, id }`
- [ ] `POST /api/entries` without required fields → returns 400
- [ ] `PATCH /api/entries/<id>` with partial body → returns 200
- [ ] `DELETE /api/entries/<id>` → returns 200 (soft delete)
- [ ] `DELETE /api/entries` with `{ ids: [...] }` → returns 200 (bulk soft delete)
- [ ] `DELETE /api/entries` with empty `ids` array → returns 400
- [ ] All entries API routes return 401 without auth, 403 for free users

---

## Phase 4 — Dashboard Enhancements

### Task 4.1 — Dashboard Tab Layout

- [ ] Navigate to `/dashboard` → confirm 3 tabs appear: Overview, Devices, Recent Entries
- [ ] Default tab is "Overview"
- [ ] Click "Devices" → confirm URL updates to `?tab=devices` and Devices content renders
- [ ] Click "Recent Entries" → confirm URL updates to `?tab=recent` and recent entries render
- [ ] Refresh on a non-default tab → confirm correct tab is still active (URL param preserved)
- [ ] Devices tab badge shows the count of connected devices (e.g. "Devices 2")
- [ ] Light mode and dark mode render correctly across all tabs

---

### Task 4.2 — Post-Login Landing Logic

- [ ] Sign in → if no `lastPage` in localStorage → confirm redirect to `/dashboard`
- [ ] Browse to `/analytics` while logged in → sign out → sign back in → confirm redirect to `/analytics` (lastPage restored)
- [ ] Browse to `/entries` → sign out → sign in → confirm redirect to `/entries`
- [ ] Browse to `/settings` → sign out → sign in → confirm redirect to `/settings`
- [ ] `lastPage` of `/login` is ignored → confirm redirect to `/dashboard` instead
- [ ] `lastPage` of `/register` is ignored → confirm redirect to `/dashboard` instead
- [ ] Extension login flow (`?ext=true`) is unaffected — still redirects through `/auth/callback?ext=true`

---

### Task 4.3 — Dashboard KPI Cards & Quick Actions

**Setup:** Use a premium account with at least some tracked entries synced to the cloud.

- [ ] KPI cards row appears at the top of the Overview tab
- [ ] **Hours card**: shows total tracked hours (matches analytics page total)
- [ ] **Entries card**: shows total entry count
- [ ] **Days card**: shows number of active days
- [ ] **Projects card**: shows total project count + last active date
- [ ] With no stats yet (new account): KPI card row is hidden, plan card and actions still render
- [ ] **Quick actions — Premium user**: "View Analytics" + "Manage Entries" + "Settings" buttons appear
- [ ] **Quick actions — Free user**: "Upgrade to Premium" + "Settings" buttons appear
- [ ] All quick action buttons navigate to the correct page

---

### Task 4.1 — Overview Tab

- [ ] Plan card shows correct plan name and badge (Free / Premium Monthly / etc.)
- [ ] Billing renewal/cancellation info shows for monthly and yearly plans
- [ ] "Manage billing" link navigates to `/billing`
- [ ] User email is shown below the plan name

---

### Task 4.1 — Devices Tab

- [ ] With no devices: shows empty state with Monitor icon + instructions
- [ ] With devices: shows list of Chrome Extension entries with partial device ID + last synced time
- [ ] Click trash icon → device disappears immediately (optimistic)
- [ ] If disconnect fails (network off) → device is restored + error toast
- [ ] "Manage in Settings" link navigates to `/settings?tab=sessions`

---

### Task 4.1 — Recent Entries Tab (Premium)

- [ ] **Premium user with entries**: shows up to 10 most recent entries in compact format
- [ ] Each row shows: date, project dot + name, description, duration
- [ ] "View all" button navigates to `/entries`
- [ ] **Premium user with no entries**: shows empty state with Clock icon + extension hint
- [ ] **Free user**: shows upgrade prompt (not the entries list)

---

## Phase 5 — Analytics Enhancements

### Task 5.1 — Analytics Filters

**Setup:** Sign in with a Premium account that has time entries spanning several weeks.

- [ ] Navigate to `/analytics` → confirm the filter bar appears below the page title
- [ ] Filter bar shows three preset buttons: **7d**, **30d**, **90d**
- [ ] Filter bar shows a **From** date input and a **To** date input
- [ ] No filter active: URL has no `dateFrom` / `dateTo` params; charts show default ranges
- [ ] Click **7d** → URL updates to `?dateFrom=<7 days ago>&dateTo=<today>` → stats + charts update
- [ ] Click **30d** → URL updates accordingly → charts update
- [ ] Click **90d** → URL updates accordingly → charts update
- [ ] Set **From** date manually → URL updates → charts update
- [ ] Set **To** date manually → URL updates → charts update
- [ ] Set both **From** and **To** → charts and KPI cards reflect only that date range
- [ ] **Daily Activity chart title** shows "Daily Activity" (not the hardcoded "Last 30 Days") when filtered
- [ ] **Weekly Hours chart title** shows "Weekly Hours" (not "Last 12 Weeks") when filtered
- [ ] **Clear** button appears when any filter is active → click → URL loses date params → charts revert to defaults
- [ ] **Streak KPI card** always shows current streak regardless of date filter (not filtered)
- [ ] Refresh page with date params in URL → correct filter is still active

**Date range edge cases:**
- [ ] From > To → charts may show empty; no crash
- [ ] Very wide range (e.g. all time) → page renders correctly
- [ ] Malformed date param in URL (e.g. `?dateFrom=notadate`) → safely ignored, defaults used (no 500 error)

---

### Task 5.2 — Analytics Empty States

**Setup:** Use an account with zero tracked entries for the full-page test.

- [ ] **Full-page empty state** (no entries ever): navigate to `/analytics` → confirm "No data yet" message with BarChart icon and a helpful hint; filter bar is hidden
- [ ] **Filtered empty state**: apply a date filter with no entries in that range → confirm compact empty state with BarChart icon + "No entries found for the selected date range." message; stats cards are hidden
- [ ] **Per-chart empty states** (individual charts with no data in range):
  - [ ] Daily Activity: shows BarChart icon + "No activity in the selected period"
  - [ ] Weekly Hours: shows BarChart icon + "No weekly data in the selected period"
  - [ ] Time by Project: shows BarChart icon + "No project data for the selected period"
  - [ ] Time by Entry Type: shows BarChart icon + "No entry type data for the selected period"
  - [ ] Hours by Day of Week: shows BarChart icon + "No day-of-week data for the selected period"
  - [ ] Peak Working Hours: shows BarChart icon + "No timing data for the selected period"
- [ ] Light mode and dark mode render correctly for all empty states
- [ ] Empty states are responsive at 375px mobile width

---

### Phase 5 — SQL Migration

> **Must apply to Supabase before testing the filter feature.**
>
> Run migration `010_analytics_date_filter.sql` in Supabase SQL Editor or via CLI.

- [ ] After applying migration: `get_user_analytics` with no date params returns same results as before
- [ ] After applying: `get_user_analytics` with `p_date_from` + `p_date_to` returns filtered totals

---

## Phase 6 — UI Polish & Navigation

### Task 6.1 — Mobile Navigation Icons

- [ ] Open the mobile menu (hamburger icon, ≤ md breakpoint)
- [ ] **Dashboard** link shows `LayoutDashboard` icon to the left of the label
- [ ] **Analytics** link shows `BarChart2` icon
- [ ] **Entries** link shows `Clock` icon
- [ ] **Billing** link shows `CreditCard` icon
- [ ] **Settings** link shows `Settings2` icon
- [ ] **Admin Panel** link (admin accounts only) shows `ShieldCheck` icon
- [ ] Icons align with the label text at the same vertical centre
- [ ] Active link highlights correctly (indigo background + indigo text) with icon
- [ ] Inactive links have correct grey colour + hover state with icon
- [ ] "Sign out" button (bottom of menu) still shows `LogOut` icon (unchanged)
- [ ] Menu renders correctly in light mode and dark mode
- [ ] Tapping any link closes the menu and navigates correctly

---

### Task 6.2 — Page Transition Animations

**Setup:** Use a screen ≥ 375px width; no special configuration needed.

- [ ] Navigate to `/dashboard` → content fades in and slides up 4px over 0.2 s
- [ ] Navigate to `/analytics` → same fade-in animation plays
- [ ] Navigate to `/entries` → same animation plays
- [ ] Navigate to `/settings` → same animation plays
- [ ] Navigate to `/billing` → same animation plays
- [ ] Navigate **between** pages (e.g. dashboard → analytics → entries) → animation replays on each navigation
- [ ] Loading skeleton appears while page fetches data (next.js loading.tsx), then fades in when ready
- [ ] Animation plays correctly in both light mode and dark mode
- [ ] Animation does NOT play inside the same page (e.g. switching settings tabs or analytics filter changes should not retrigger fade-in)
- [ ] `prefers-reduced-motion` — if OS has reduced motion enabled, animation should not be jarring (verify the `both` fill mode keeps content visible at rest)

---

## Phase 7 — Project Hourly Pricing & Earnings

### Task 7.1 — Earnings Settings Tab

**Setup:** Sign in with any authenticated account.

- [ ] Navigate to `/settings?tab=earnings` → confirm the "Earnings" tab renders with DollarSign icon
- [ ] **Default Hourly Rate** field starts empty (or shows previously saved value)
- [ ] Enter a rate (e.g. `50`) → click "Save" → toast "Settings saved"
- [ ] Refresh page → confirm `50` persists in the input
- [ ] Clear the rate field → save → confirm `null` is accepted (no error)
- [ ] **Currency** dropdown shows supported currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, INR, BRL, SEK)
- [ ] Select "EUR" → save → refresh → confirm "EUR" persists
- [ ] Light mode and dark mode render correctly
- [ ] Responsive at 375px mobile width

---

### Task 7.2 — Per-Project Hourly Rate (Dashboard)

**Setup:** Premium user with at least one project synced.

- [ ] Navigate to `/dashboard` → Projects card shows existing projects
- [ ] Click the edit (pencil) icon on a project → inline edit row expands
- [ ] Confirm "Rate/hr" input appears in the edit form
- [ ] Rate field shows placeholder "Default ($50)" when project has no rate and default rate is set to 50
- [ ] Enter a per-project rate (e.g. `75`) → save → confirm the project card shows an emerald rate badge "USD 75/hr"
- [ ] Clear the rate → save → confirm badge disappears (falls back to default rate)
- [ ] When both project rate and default rate are `null` → no rate badge displayed
- [ ] Creating a new project → hourly rate starts as `null`

---

### Task 7.3 — Earnings Page (Premium Gate)

**Setup:** Test with both a free and a premium account.

- [ ] **Free user**: navigate to `/earnings` → confirm blurred/locked preview with "Upgrade to Premium" prompt and link to `/billing`
- [ ] **Premium user**: navigate to `/earnings` → confirm page loads with real earnings data

---

### Task 7.4 — Earnings Report (Premium)

**Setup:** Premium user with projects that have hourly rates set.

- [ ] Summary cards visible: Grand Total, Avg Rate, Total Hours, Total Projects
- [ ] Grand Total shows in correct currency (e.g. "€1,250.00" for EUR)
- [ ] Table columns: Project, Hours, Rate, Total
- [ ] Each project row shows: project name/color dot, tracked hours, effective rate, calculated total
- [ ] Grand total row at bottom in emerald accent
- [ ] Project with `hourly_rate` set → uses that rate
- [ ] Project with `hourly_rate = null` → uses default hourly rate from settings
- [ ] Both rates `null` → shows $0.00 for that project (no error)
- [ ] Light mode and dark mode render correctly
- [ ] Responsive at 375px mobile width

---

### Task 7.5 — Earnings Date Filter

- [ ] Filter bar shows preset buttons: Week, Month, Quarter, Year
- [ ] Click "Week" → URL updates with `dateFrom`/`dateTo` → summary cards and table update
- [ ] Click "Month" → data updates to current month range
- [ ] Click "Quarter" → data updates to current quarter range
- [ ] Click "Year" → data updates to current year range
- [ ] Manual "From" and "To" date inputs work correctly
- [ ] Clear button resets filters → all-time data shown
- [ ] Refresh with date params in URL → correct filter still active

---

### Task 7.6 — Earnings CSV Export

- [ ] Click "Export CSV" → browser downloads a file
- [ ] File named `earnings_<from>_<to>.csv` (or `earnings_all.csv` if no filter)
- [ ] CSV content includes: Project, Hours, Rate, Total columns
- [ ] Data in CSV matches what's shown in the table
- [ ] Currency values are properly formatted

---

### Task 7.7 — Rate Fallback Logic

- [ ] Project with `hourly_rate = 75` and `default_hourly_rate = 50` → earnings use 75
- [ ] Project with `hourly_rate = null` and `default_hourly_rate = 50` → earnings use 50
- [ ] Project with `hourly_rate = null` and `default_hourly_rate = null` → earnings show $0.00 (no crash)
- [ ] All projects `null` rates → Grand Total is $0.00

---

### Sidebar & Header Updates

- [ ] `/earnings` appears in the sidebar navigation with DollarSign icon (after Analytics)
- [ ] `/earnings` page title shows "Earnings" with description "Track project revenue" in the header
- [ ] `/groups` appears in the sidebar (All-In users only) with Users icon

---

### Phase 7 — API Sanity Checks

- [ ] `PUT /api/settings` with `{ default_hourly_rate: 50, currency: "EUR" }` → returns 200
- [ ] `PUT /api/settings` with `{ default_hourly_rate: null }` → returns 200
- [ ] `PUT /api/projects/<id>` with `{ hourly_rate: 75 }` → returns 200
- [ ] `PUT /api/projects/<id>` with `{ hourly_rate: null }` → returns 200
- [ ] All earnings-related endpoints return 401 without auth

---

## Phase 8 — All-In Subscription & Billing

### Task 8.1 — All-In Plan Cards on Billing Page

**Setup:** Sign in with a free or premium account.

- [ ] Navigate to `/billing` → confirm "All-In Plans" section appears
- [ ] Two cards visible: "All-In Monthly" ($29.99/mo) and "All-In Yearly" ($299/yr, "Save 17%")
- [ ] Feature list on each card includes: "Everything in Premium", "Team groups", "Shared time tracking", "Group analytics", "Earnings reports"
- [ ] "Upgrade to All-In Monthly" and "Upgrade to All-In Yearly" checkout buttons are clickable
- [ ] **Already All-In user**: current plan card shows "Current Plan" badge instead of checkout button
- [ ] Active All-In banner at top shows "All-In Monthly" or "All-In Yearly" with renewal date and "Manage Subscription" button

---

### Task 8.2 — All-In Checkout Flow

**Setup:** Test Stripe checkout with test card `4242 4242 4242 4242`.

- [ ] Click "Upgrade to All-In Monthly" → redirects to Stripe Checkout
- [ ] Stripe Checkout shows correct price ($29.99/mo) and plan name
- [ ] Complete payment → redirect back to `/billing` with active All-In plan
- [ ] Subscription record in Supabase shows `plan: 'allin_monthly'`, `status: 'active'`
- [ ] `isPremiumUser()` returns `true` for All-In user
- [ ] `isAllInUser()` returns `true` for All-In user

---

### Task 8.3 — Stripe Webhooks for All-In Plans

- [ ] `checkout.session.completed` with `metadata.plan = 'allin_monthly'` → subscription upserted correctly
- [ ] `checkout.session.completed` with `metadata.plan = 'allin_yearly'` → subscription upserted correctly
- [ ] `customer.subscription.updated` with all-in price ID → plan and status updated
- [ ] `customer.subscription.deleted` for all-in → plan set to `'free'`, status `'canceled'`
- [ ] After cancellation → user loses access to groups and earnings features

---

## Phase 9 — Groups

### Task 9.1 — Groups Page (All-In Gate)

**Setup:** Test with both a non-all-in user and an all-in user.

- [ ] **Free / Premium user**: navigate to `/groups` → confirm upgrade prompt with team icon and "Upgrade to All-In" button linking to `/billing`
- [ ] **All-In user**: navigate to `/groups` → confirm page loads with "My Groups" and "Invitations" tabs

---

### Task 9.2 — Create a Group

**Setup:** All-In user.

- [ ] Click "Create Group" → dialog opens with name input
- [ ] Enter a group name → click "Create" → toast success → group card appears
- [ ] Group card shows: name, member count (1), your role (admin), join code
- [ ] Creator is automatically added as `admin` member
- [ ] Creating a group without a name → validation error

---

### Task 9.3 — Group Detail (Inline Expand)

- [ ] Click a group card → card expands inline showing members list, invite form, join code
- [ ] Members list shows: avatar initial, name/email, role badge (admin/member)
- [ ] Admin sees: invite input, remove member buttons, role toggle buttons, join code copy, delete group button
- [ ] Non-admin member sees: members list only (no admin actions)

---

### Task 9.4 — Copy Join Code

- [ ] Click the copy icon next to join code → code copied to clipboard → toast "Join code copied"
- [ ] Verify copied code matches what's displayed

---

### Task 9.5 — Invite Member by Email

**Setup:** All-In admin of a group.

- [ ] Enter an email in the invite input → click "Invite" → toast "Invitation sent to [email]"
- [ ] Invitation appears in the group's invitations list (if visible to admin)
- [ ] Invited user sees the invitation in their "Invitations" tab on `/groups`

---

### Task 9.6 — Accept / Decline Invitation

**Setup:** All-In user with a pending invitation.

- [ ] "Invitations" tab shows badge with pending count
- [ ] Each invitation shows: group name, expiry date, Accept and Decline buttons
- [ ] Click "Accept" → invitation card removed → group appears in "My Groups" tab
- [ ] Click "Decline" → invitation card removed → group does NOT appear
- [ ] Badge count updates after accept/decline

---

### Task 9.7 — Join Group via Code

**Setup:** All-In user who is NOT already a member of the target group.

- [ ] Click "Join" button → dialog opens with code input
- [ ] Enter a valid join code → click "Join" → toast "Joined [group name]" → group appears in list
- [ ] Enter an **invalid** code → toast error "Invalid join code"
- [ ] Enter code for a group you're **already in** → toast error "You are already a member of this group"
- [ ] Enter code for a **full** group → toast error "Group is at maximum capacity"

---

### Task 9.8 — Join Without All-In Subscription

- [ ] Free or Premium user calls `POST /api/groups/join` → returns 403 "All-In subscription required"

---

### Task 9.9 — Member Management

**Setup:** Group admin with at least 2 other members.

- [ ] **Promote to admin**: click role toggle on a member → role badge changes to "admin" → toast "Role updated"
- [ ] **Demote to member**: click role toggle on another admin → role badge changes to "member"
- [ ] **Remove member**: click trash icon on a member → member disappears from list
- [ ] **Cannot remove owner**: trash icon hidden or disabled for the group owner
- [ ] If trying to remove owner via API → returns 400 "Owner cannot be removed"

---

### Task 9.10 — Leave a Group (Self-Remove)

- [ ] Non-owner member can leave via a "Leave Group" action
- [ ] After leaving → group no longer appears in "My Groups"

---

### Task 9.11 — Delete a Group

**Setup:** Group owner.

- [ ] Click "Delete Group" → confirmation prompt appears
- [ ] Confirm → group, members, and invitations are deleted → card removed
- [ ] Non-owner trying to delete via API → returns 403

---

### Task 9.12 — Invitation Capacity Check

**Setup:** Group at maximum member count.

- [ ] Admin tries to invite → toast error "Group is at maximum capacity"
- [ ] API returns 400

---

### Phase 9 — Groups API Sanity Checks

- [ ] `GET /api/groups` → returns 200 + array of user's groups (All-In required)
- [ ] `POST /api/groups` with `{ name: "Team" }` → returns 201 + new group (All-In required)
- [ ] `GET /api/groups/<id>` → returns 200 + group details + members (membership required)
- [ ] `PATCH /api/groups/<id>` with `{ name: "New Name" }` → returns 200 (owner only)
- [ ] `DELETE /api/groups/<id>` → returns 200 (owner only)
- [ ] `POST /api/groups/<id>/members` with `{ email: "user@test.com" }` → returns 200 (admin only)
- [ ] `DELETE /api/groups/<id>/members?userId=<id>` → returns 200 (admin or self)
- [ ] `PATCH /api/groups/<id>/members/<userId>` with `{ role: "admin" }` → returns 200 (admin only)
- [ ] `POST /api/groups/join` with `{ code: "abc123" }` → returns 200 (All-In + valid code)
- [ ] `GET /api/groups/invitations` → returns 200 + pending invitations
- [ ] `POST /api/groups/invitations` with `{ id: "...", action: "accept" }` → returns 200
- [ ] `POST /api/groups/invitations` with `{ id: "...", action: "decline" }` → returns 200
- [ ] All group API routes return 401 without auth
- [ ] All group API routes return 403 for non-all-in users (except invitations)

---

## Phase 10 — Admin Group Management

### Task 10.1 — Admin Groups Tab

**Setup:** Sign in with an admin account.

- [ ] Admin navigation bar shows "Groups" tab with `UsersRound` icon
- [ ] Click "Groups" → navigates to `/admin/groups`
- [ ] Page loads with a table of all groups

---

### Task 10.2 — Admin Groups Table

- [ ] Table columns: Name, Owner (email), Members (count), Max Members (editable), Join Code, Created
- [ ] Member count is accurate for each group
- [ ] Owner email is displayed correctly

---

### Task 10.3 — Edit Group Max Members

- [ ] Change the max members input for a group (e.g. from 10 to 25)
- [ ] Click "Save" → toast "Max members updated"
- [ ] Refresh page → confirm new max persists
- [ ] Set max lower than current member count → should warn or reject

---

### Task 10.4 — Admin Groups Page Header

- [ ] `/admin/groups` shows title "Groups" with description "Group management" in AppHeader

---

### Phase 10 — Admin API Sanity Checks

- [ ] `PATCH /api/admin/groups` with `{ groupId: "...", maxMembers: 25 }` → returns 200 (admin only)
- [ ] `PATCH /api/admin/groups` without admin role → returns 403
- [ ] `PATCH /api/admin/groups` without auth → returns 401
