# Email Verification Fix

## Problem

Users were not receiving verification emails after creating a new account on w-timer.com.

### Root Causes

**1. SMTP Provider (Zoho) blocked from cloud IPs**

Supabase runs on AWS. Zoho SMTP (`smtp.zoho.eu`) blocks connections from major cloud provider IP ranges, causing 10-54 second timeouts on every email send attempt. This affected all Supabase Auth emails (verification, password reset, magic link).

**Fix:** Switched SMTP provider from Zoho to **Resend** (`smtp.resend.com`), which is designed for transactional email from cloud environments.

**2. Sign-up route didn't handle existing unconfirmed users**

When `supabase.auth.signUp()` is called for an email that already exists in an unconfirmed state, Supabase returns a fake success response with `identities: []` (for security — to not reveal whether an email is registered). However, it does **not** send a new verification email in this case.

The sign-up route only checked for `error` and missed this edge case, so users who signed up while SMTP was broken could never get a verification email — even after SMTP was fixed.

**Fix:** Added detection for `data.user.identities?.length === 0` in the sign-up route. When detected, the server calls `supabase.auth.resend({ type: 'signup' })` to trigger a new verification email.

**3. Client-side resend was fragile**

The "Resend verification email" button on `/verify-email` called `supabase.auth.resend()` directly from the browser. This fails silently behind corporate proxies that block direct connections to Supabase domains.

**Fix:** Created a server-side `/api/auth/resend-verification` endpoint. The verify-email page now calls this endpoint via `fetch()`, keeping all Supabase communication server-side (consistent with all other auth flows).

**4. Transporter configuration issues**

Both `web/lib/email/transporter.ts` and `admin/lib/email/transporter.ts` had:
- Hardcoded `secure: true` (breaks port 587/STARTTLS)
- No connection timeouts (hangs indefinitely on SMTP failures)
- Connection pooling enabled (`pool: true`) — useless on Vercel serverless

**Fix:** Dynamic `secure: port === 465`, added 10-15s timeouts, removed pooling.

## Files Changed

| File | Change |
|------|--------|
| `web/app/api/auth/sign-up/route.ts` | Detect unconfirmed users, auto-resend verification |
| `web/app/api/auth/resend-verification/route.ts` | New server-side resend endpoint |
| `web/app/(public)/verify-email/VerifyEmailContent.tsx` | Use server-side resend instead of browser Supabase client |
| `web/middleware.ts` | Skip auth check on `/api/auth` routes |
| `web/lib/email/transporter.ts` | Fix secure flag, add timeouts, remove pooling |
| `admin/lib/email/transporter.ts` | Same transporter fixes |
| `web/.env.local` | SMTP config: Zoho → Resend |
| `admin/.env.local` | SMTP config: Zoho → Resend |
| `src/__tests__/email.test.ts` | 53 tests covering templates, transporter, send logic, sign-up flow |
| `scripts/test-smtp.ts` | Direct SMTP test script (Node.js native TLS) |
| `scripts/test-supabase-email.ts` | Supabase GoTrue SMTP test script |

## Verification

- `scripts/test-smtp.ts` — confirmed Resend SMTP sends emails successfully
- `scripts/test-supabase-email.ts` — confirmed Supabase GoTrue sends emails via configured SMTP (2s response)
- 175 unit tests passing (53 email-related)
