You are a Senior Full-Stack Developer and Systems Architect specializing in SaaS applications and email marketing and transactional automation systems.

Your task is to create and develop a comprehensive, specialized email management dashboard within a SaaS application for work time tracking. This system should give management complete control over testing, editing, sending, scheduling, and monitoring email statistics. The code must be scalable, clean, professionally documented, and adhere to best practices in security and high performance.

Frontend: Next.js (App Router), React, TailwindCSS, TypeScript.

Email Editor: Integrate a custom library such as @react-email/components or integrate an open-source visual editor (block-based builder) that supports drag-and-drop functionality with image import and visual editing options.

Backend/API: Next.js API Routes, TypeScript.

Database: PostgreSQL with advanced ORM (Prisma).

Queue & Scheduling: Bullmq for task management with ioredis (a Redis database for storing queues).

Email Providers: Abstract class design enables seamless switching to services (Resend, Postmark, AWS SES).

Testing & Anti-Spam: Integration with Mailtrap API for testing in mock development environments, and SpamAssassin API (via Postmark endpoint <https://spamcheck.postmarkapp.com/filter>) for evaluating and checking message content and generating spam scores.

Please work systematically and sequentially to implement the following components, providing detailed code and architectural schema for each step, along with a brief explanation of each part's role:

Step 1: Database Schema (via Prisma)
Write a schema.prisma file to represent the core entities and their relationships to support the system:

User/Contact Schema: To store SaaS application customer data, time zone preferences, and segments.

Template Schema: Stores the template structure and must include htmlBody, jsonDesign (to preserve the editor structure for later modification), and metadata such as version.

Campaign Schema: Represents scheduled or instant mailing campaigns, associated with a specific template and target segment, and contains a status field and a scheduledAt field.

EmailJob Schema (Queue Log): Represents each individual email attempt sent to the user, containing the job ID, campaign association, status (pending, sent, failed), and errorlog.

TrackingEvent form: To record statistics and incoming events (Open, Click, Bounce, Delivered, Spam) with detailed fields for IPAddress, UserAgent, and Timestamp.

ABTest form: To link two campaign variables (Variant A and Variant B) and track which one achieves the best conversion rate.

Step 2: Build a Dynamic Email Editor Component
Create a React (Client Component) component that provides an intuitive editing interface:

Utilize a drag-and-drop interface to build blocks of text, images, buttons, and countdown timers.

Support the insertion of dynamic Work Timer variables (e.g., {{userName}}, {{totalHoursWorkedThisWeek}}, {{currentProject}}).

Add a Live Preview feature to preview the template in mobile and desktop modes.

Create a helper function to generate the final HTML code and plain text from the editor design and save it to the database. Step 3: Setting Up an Asynchronous Scheduling System (Queues & BullMQ Implementation)

Write BullMQ configuration files to create a flexible task system that doesn't take up the server:

Create and configure an email queue.

Program a Worker object that processes tasks regularly. The Worker should include a robust Rate Limiting system to protect APIs (e.g., processing a maximum of 50 emails/second).

Implement Exponential Backoff logic to handle temporary API failures (attempts: 5, backoff: { type: 'exponential', delay: 1000 } with Jitter enabled).

Include a specialized function based on upsertJobScheduler to schedule recurring tasks, such as automatically sending weekly productivity reports based on a Cron expression.

Step 4: Webhooks Sending and Receiving Interfaces and Tracking Mechanisms

Develop a service layer that includes a unified `sendEmailService` function using an adapter pattern to facilitate switching between `Resend`, `Postmark`, and `Mailtrap`.

Develop a secure webhook endpoint (API Route Webhook: POST /api/webhooks/email-events) that receives and processes delivery update payloads (Delivered, Bounced, Opened, Clicked) to find matching IDs and update the TrackingEvent status in the database in real time.

Write a helper function to include a 1x1 transparent tracking pixel and handle link wrapping to support custom open and click tracking before delivering the HTML to the service provider.

Step 5: Quality Assurance and Spam Checking (Spam Check & QA API)
Write a dedicated endpoint (API Route: POST /api/emails/spam-check) that receives the HTML and suggested headers and passes them via an HTTP request to the Postmark interface for spam evaluation. The endpoint returns the Spam Score to the user so they can correct the template if it exceeds 5.

Implement conditional mechanisms to automatically redirect messages via Mailtrap when the environment variable NODE_ENV is set to 'development' to prevent incorrect submissions.

Step 6: Dashboard Analytics UI Design
Write the interactive user interface components (using Tailwin).
Using CSS and graphing libraries (such as Recharts) to render the following screens in a drawer-style and card format:

Overview Analytics: Displays summative top cards of metrics (open rate, click rate, bounces, and total submissions) with a graph showing pre-aggregated submission trends over time.

Custom Work Timer Reports: An interface for managing the submission of "Weekly Usage and Productivity Reports," displaying metrics for user interaction with sensitive system notifications (such as Time to Triage alerts).

A/B Testing Comparisons: A live monitoring screen that displays the performance of Variant A versus Variant B side-by-side to select the winning version for marketing.

Please address these steps sequentially and in detail to ensure proper architectural coherence.
