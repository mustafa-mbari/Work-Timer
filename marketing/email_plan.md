# Plan: Register Page Redesign + Custom Email System + Admin Email Page

This plan outlines the implementation of a modern, branded authentication interface and a robust custom email system for Work Timer.

## Overview

The plan covers three primary areas:

1. **Authentication Redesign**: Split-layout redesign for Register and Login pages with branding and social proof.
2. **Custom Email System**: Nodemailer + Zoho SMTP integration with 7 branded HTML templates.
3. **Admin Email Management**: A dedicated interface for monitoring logs, previewing templates, and testing delivery.

---

## Phase 1: Database & Types

### 1.1 Migration

**File**: `supabase/migrations/029_email_logs.sql`

Create the `email_logs` table with the following structure:

- `id`: UUID (Primary Key)
- `recipient`: TEXT
- `type`: TEXT
- `subject`: TEXT
- `status`: TEXT (`sent`, `failed`, `bounced`)
- `message_id`: TEXT
- `error`: TEXT (Optional)
- `metadata`: JSONB
- `created_at`: TIMESTAMPTZ
- `sent_by`: UUID (Foreign Key to `auth.users`, Nullable)

**Constraints**:

- Indexes on `created_at DESC`, `type`, and `recipient`.
- RLS enabled (Service role access only).

### 1.2 Type Updates

Update `web/lib/shared/types.ts` and `admin/lib/shared/types.ts`:

- Add `DbEmailLog` and `DbEmailLogInsert` interfaces.
- Update `Database.public.Tables` to include `email_logs`.

---

## Phase 2: Email Infrastructure (Web App)

### 2.1 Dependencies

```bash
cd web
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

### 2.2 Environment Variables

Add the following to `.env.local` and `.env.local.example`:

```env
SMTP_HOST=smtp.zoho.eu
SMTP_PORT=465
SMTP_USER=info@w-timer.com
SMTP_PASS=<zoho-app-password>
SMTP_FROM_NAME=Work Timer
SMTP_FROM_EMAIL=info@w-timer.com
```

### 2.3 File Structure (`web/lib/email/`)

| File | Purpose |
| :--- | :--- |
| `transporter.ts` | Singleton Nodemailer transporter using Zoho SMTP. |
| `send.ts` | `sendEmail` utility with logging to `email_logs`. |
| `templates/base.ts` | Shared HTML wrapper (logo, footer, inline CSS, Inter font). |
| `templates/` | Branded HTML templates (Welcome, Invite, Reset, Billing, etc.). |
| `index.ts` | Barrel exports for the email module. |

### 2.4 Email Templates & Types

**Supported Email Types:**
`welcome`, `email_verification`, `group_invitation`, `password_reset_confirmation`, `billing_notification`, `invoice_receipt`, `trial_ending`, `test`.

**Design Tokens:**

- **Background**: `#fafaf9` (Stone-50)
- **Card**: `#ffffff`
- **Text**: `#44403c` (Stone-700)
- **Accent**: `#6366f1` (Indigo-500)
- **Button**: Indigo-500 bg, white text, 8px radius.

### 2.5 Integration Points

| Trigger Event | Location | Template |
| :--- | :--- | :--- |
| Verification Success | `web/app/auth/callback/route.ts` | `welcome` |
| Group Invite | `web/app/api/groups/[id]/invitations/route.ts` | `group_invitation` |
| Password Change | `web/app/api/auth/password-changed/route.ts` | `password_reset_confirmation` |
| Subscription Created | Stripe Webhook (`customer.subscription.created`) | `billing_notification` |
| Invoice Paid | Stripe Webhook (`invoice.payment_succeeded`) | `invoice_receipt` |
| Trial Ending | Stripe Webhook (`customer.subscription.trial_will_end`) | `trial_ending` |

---

## Phase 3: Register Page Redesign

### 3.1 `RegisterForm.tsx` Enhancements

- **Desktop (lg+):** Two-column split layout.
  - **Left Panel:** Indigo gradient, logo, "Start tracking your time today" headline, and feature benefits.
  - **Right Panel:** Registration form card.
- **Mobile:** Single column with centered logo and compact form.
- **New Field:** Added optional **Display Name** input (mapped to `user_metadata.full_name`).

### 3.2 API Updates

- **File**: `web/app/api/auth/sign-up/route.ts`
- **Change**: Accept `displayName` in the request body and pass it to `supabase.auth.signUp()`.

---

## Phase 4: Login Page Redesign

### 4.1 `LoginForm.tsx` Enhancements

- **Layout:** Identical split-layout structure to the Register page for visual consistency.
- **Content:** "Welcome back" headline and feature highlights in the left panel.

---

## Phase 5: Admin Email Management

### 5.1 Admin Page Features (`admin/app/(admin)/emails/page.tsx`)

- **Stats Dashboard:** Real-time counts for Sent Today, This Week, This Month, and Failed.
- **Test Sender:** Form to send test emails using any template.
- **Template Preview:** Interactive tabs with an `iframe` preview of rendered HTML templates.
- **Email Logs:** Paginated table showing recipient, type, subject, status, and timestamp.

### 5.2 Admin API Endpoints

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/emails` | `GET` | Fetch logs and statistics. |
| `/api/emails/test` | `POST` | Trigger a test email. |
| `/api/emails/preview` | `GET` | Get rendered HTML for a template preview. |

---

## Phase 6: Implementation Checklist

1. [ ] Database Migration (`029_email_logs.sql`)
2. [ ] Shared Type Definitions
3. [ ] Nodemailer Infrastructure & Transporter
4. [ ] HTML Template Development (7 Templates)
5. [ ] Integration with Auth & Stripe Webhooks
6. [ ] Register/Login Page UI Overhaul
7. [ ] Admin Dashboard Implementation
8. [ ] Manual SMTP Configuration in Supabase Dashboard

---

## Verification

- [ ] Register/Login pages look premium and are responsive.
- [ ] Display name is correctly saved to user metadata.
- [ ] Emails are successfully delivered via Zoho SMTP.
- [ ] Email logs are correctly recorded in the database.
- [ ] Admin template previews render correctly.
- [ ] All i18n strings (English/German) are implemented.
