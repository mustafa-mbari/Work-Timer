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

> Not yet implemented. Tests will be added when Phase 3 is complete.

---

## Phase 4 — Dashboard Enhancements

> Not yet implemented. Tests will be added when Phase 4 is complete.

---

## Phase 5 — Analytics Enhancements

> Not yet implemented. Tests will be added when Phase 5 is complete.

---

## Phase 6 — UI Polish & Navigation

> Not yet implemented. Tests will be added when Phase 6 is complete.
