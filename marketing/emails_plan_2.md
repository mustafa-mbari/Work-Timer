# Advanced Email Management & Automation System

This document outlines the architectural requirements and implementation plan for a specialized email management dashboard. This system provides complete control over testing, editing, scheduling, and monitoring transactional and marketing emails.

## 🏗️ System Architecture & Tech Stack

| Component | Technology |
| :--- | :--- |
| **Queue & Scheduling** | BullMQ with ioredis |
| **Email Providers** | Supabase Auth & Zoho Mail (SMTP/API) |
| **Testing & Mocking** | Mailtrap API |
| **Spam Analysis** | SpamAssassin API (via Postmark Spamcheck) |
| **Analytics & UI** | Tailwind CSS & Recharts |

---

## 📅 Phase 1: Database Schema & Tracking

### 1.1 Data Models

* **Campaign Schema**: Represents scheduled or instant mailing campaigns associated with a specific template and target segment.
  * **Fields**: `id`, `template_id`, `segment_id`, `status`, `scheduled_at`.
* **EmailJob Schema (Queue Log)**: Tracks individual email attempts.
  * **Fields**: `job_id`, `campaign_id`, `status` (pending, sent, failed), `error_log`.
* **TrackingEvents**: Record statistics for incoming events.
  * **Events**: Open, Click, Bounce, Delivered, Spam.
  * **Metadata**: `ip_address`, `user_agent`, `timestamp`.
* **A/B Test**: Link campaign variables (Variant A and Variant B) to track conversion rate performance.

---

## 🎨 Phase 2: Dynamic Email Editor

Implement a professional email editor component with:

* **Dynamic Variables**: Support for Work Timer variables (e.g., `{{userName}}`, `{{totalHoursWorkedThisWeek}}`, `{{currentProject}}`).
* **Live Preview**: Real-time rendering for both Mobile and Desktop viewports.
* **Code Generation**: Helper function to produce cross-client compatible HTML and Plain Text.

---

## ⚡ Phase 3: Asynchronous Scheduling (BullMQ)

Configure a high-performance task management system:

* **Email Queue**: Dedicated BullMQ queue for outbound mail.
* **Worker Configuration**:
  * **Rate Limiting**: Protect APIs by processing a maximum of 50 emails/second.
  * **Exponential Backoff**: 5 retries with jitter and exponential delay (`type: 'exponential', delay: 1000`).
* **Recurring Tasks**: Use `upsertJobScheduler` for automated crons (e.g., Weekly Productivity Reports).

---

## ⚓ Phase 4: Webhooks & Real-time Tracking

**Endpoint**: `POST /api/webhooks/email-events`

* Secure receiving interface for provider webhooks.
* Real-time status updates for `TrackingEvent` records based on matching unique IDs.

---

## 🛡️ Phase 5: Quality Assurance & Spam Prevention

### 5.1 Spam Check API

**Endpoint**: `POST /api/emails/spam-check`

* Passes HTML and headers to the Postmark Spamcheck interface.
* Returns a **Spam Score** to allow template correction before broadcast (target score < 5).

### 5.2 Environment Routing

* **Development**: Messages are automatically redirected via **Mailtrap** when `NODE_ENV === 'development'` to prevent accidental sends to real users.

---

## 📊 Phase 6: Dashboard Analytics UI

Interactive user interface utilizing Tailwind CSS and charting libraries (Recharts).

### Components

* **Overview Analytics**: Summative metrics cards (Open rate, Click rate, Bounces) with historical trend graphs.
* **Custom Work Timer Reports**: Management interface for "Weekly Usage and Productivity Reports" and "Time to Triage" alerts.
* **A/B Test Comparisons**: Side-by-side performance monitoring to identify winning marketing variants.

---

## ✅ Implementation Checklist

* [ ] Schema Implementation (Prisma/Database)

* [ ] Email Editor Prototype
* [ ] BullMQ Setup & Worker Logic
* [ ] Webhook Integration
* [ ] Spam Check Integration
* [ ] Analytics Dashboard Development
