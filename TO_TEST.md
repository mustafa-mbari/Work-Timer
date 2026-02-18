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

> Not yet implemented. Tests will be added when Phase 2 is complete.

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
