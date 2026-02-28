import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how Work Timer collects, uses, and protects your data — and how our offline-first, privacy-first design keeps your time tracking data under your control.',
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3 mt-10">
        {title}
      </h2>
      <div className="space-y-3 text-stone-600 dark:text-stone-400 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-stone-800 dark:text-stone-200 mt-5 mb-1">
      {children}
    </h3>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside ml-5 space-y-1.5 text-stone-600 dark:text-stone-400">
      {children}
    </ul>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-stone-800 dark:text-stone-200">{children}</strong>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-stone-100 dark:bg-[var(--dark-elevated)] px-1 py-0.5 rounded font-mono">
      {children}
    </code>
  )
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
    >
      {children}
    </a>
  )
}

// ─── Table of contents ────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'data-collected', label: 'Data we collect' },
  { id: 'data-storage', label: 'Where your data is stored' },
  { id: 'how-we-use', label: 'How we use your data' },
  { id: 'what-we-dont-do', label: 'What we do NOT do' },
  { id: 'third-parties', label: 'Third-party services' },
  { id: 'retention', label: 'Data retention & deletion' },
  { id: 'security', label: 'Security' },
  { id: 'childrens-privacy', label: "Children's privacy" },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'contact', label: 'Contact us' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">

      {/* ── Header ── */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-500">
          Last updated: <time dateTime="2025-01-01">February 28, 2026</time>
        </p>
        <p className="mt-4 text-stone-600 dark:text-stone-400 leading-relaxed">
          Your privacy matters to us. Work Timer is built on an <Strong>offline-first,
            privacy-first</Strong> philosophy — your time entries live on your own device by
          default and are never shared without your explicit action. This policy explains
          exactly what data we collect (and what we don&apos;t), where it goes, and how you
          can delete it at any time.
        </p>
      </header>

      {/* ── Table of contents ── */}
      <nav
        aria-label="Table of contents"
        className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-card)] px-6 py-5 mb-10"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">
          Contents
        </p>
        <ol className="space-y-1.5 list-decimal list-inside text-sm text-stone-600 dark:text-stone-400">
          {TOC_ITEMS.map(({ id, label }, i) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Sections ── */}
      <article className="divide-y divide-stone-100 dark:divide-[var(--dark-border)]">

        {/* 1. Introduction */}
        {/* CHANGE 1: added 2–3 sentences clarifying extension + web app relationship */}
        <Section id="introduction" title="1. Introduction">
          <p>
            Work Timer (&ldquo;Work Timer&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
            &ldquo;us&rdquo;) is a time-tracking tool that consists of two parts: a{' '}
            <Strong>Chrome extension</Strong> and a <Strong>companion web app</Strong>{' '}
            at{' '}
            <InlineLink href="https://w-timer.com">w-timer.com</InlineLink>. This Privacy
            Policy applies to both and describes how we handle your information when you use
            either part of the service.
          </p>
          <p>
            You can use the Chrome extension entirely on its own, with no account and no
            internet connection required — all your data stays on your device in that case.
            Optionally, you can create a free account to unlock cloud sync, which lets your
            data follow you across multiple devices and browsers. This policy covers both
            usage modes.
          </p>
          <p>
            By installing the extension or using the website you agree to the practices
            described below. If you do not agree, please uninstall the extension and stop
            using the website.
          </p>
        </Section>

        {/* 2. Data we collect */}
        <Section id="data-collected" title="2. Data we collect">
          <p>
            We collect only the minimum data needed to operate the service. The exact data
            collected depends on how you use Work Timer:
          </p>

          {/* CHANGE 2: explicit chrome.storage.local mention */}
          <H3>a) Local-only storage (no account required)</H3>
          <p>
            When you use the Chrome extension without signing in, <Strong>all data is stored
              locally on your device</Strong> using Chrome&apos;s{' '}
            <Code>chrome.storage.local</Code> API. This allows the extension to work fully
            offline and keeps every piece of your data on your own machine — nothing is
            transmitted to our servers. The data stored locally includes:
          </p>
          <Ul>
            <Li>Time entries (start time, end time, duration, description)</Li>
            <Li>Projects and tags you create</Li>
            <Li>Timer state (running/paused, elapsed time)</Li>
            <Li>App settings (theme, Pomodoro configuration, idle timeout, notifications)</Li>
            <Li>Sync queue (a temporary list of pending changes, only used locally unless sync is enabled)</Li>
          </Ul>
          <p>
            <Code>chrome.storage.local</Code> is sandboxed to the Work Timer extension and
            cannot be read by websites you visit or by other browser extensions.
          </p>

          <H3>b) Account &amp; cloud sync (optional)</H3>
          <p>
            If you create an account and enable cloud sync, the data listed above is
            uploaded to our servers so it can be accessed across devices. We additionally
            store:
          </p>
          <Ul>
            <Li>Your email address (used for authentication and account communications)</Li>
            <Li>Display name (optional; populated from OAuth providers like Google if you sign in that way)</Li>
            <Li>Subscription status and plan tier</Li>
            <Li>Sync cursor timestamps (to enable incremental sync and detect conflicts)</Li>
          </Ul>

          {/* CHANGE 5 (part 1): revised analytics section — no third-party trackers in extension */}
          <H3>c) Usage analytics (premium)</H3>
          <p>
            We do not use any third-party analytics tools inside the Chrome extension. The
            extension itself generates no telemetry or usage statistics beyond the time
            entries you deliberately create. Premium subscribers can access aggregated
            personal analytics (weekly totals, daily averages, project breakdowns) on the
            web app — these are computed entirely from your own time entries and displayed
            only to you.
          </p>

          <H3>d) Payment information</H3>
          <p>
            If you subscribe to a paid plan, your payment is processed by a third-party
            payment provider (see &ldquo;Third-party services&rdquo; below). We receive only
            a subscription status token and a customer reference — we never see or store
            your full card number, CVV, or bank details.
          </p>

          {/* CHANGE 5 (part 2): revised technical logs section — more precise */}
          <H3>e) Technical server logs</H3>
          <p>
            When you use the web app or the extension&apos;s cloud sync feature, our
            hosting infrastructure automatically records standard server logs. These may
            include your IP address, browser type and version, operating system, the pages
            or API endpoints requested, and error traces. We use this information solely to
            keep the service secure, diagnose technical problems, and measure overall
            availability. Logs are retained for up to 30 days and are not used for
            advertising or profiling.
          </p>
          <p>
            We do not use third-party behavioral analytics services (such as Mixpanel,
            Amplitude, or Segment) on the web app. Where possible, log data is handled in
            an aggregated or pseudonymous form.
          </p>

          {/* CHANGE 3: new dedicated subsection on content script behavior */}
          <H3>f) Content script behavior</H3>
          <p>
            The Work Timer Chrome extension injects a small <Strong>content script</Strong>{' '}
            into the pages you visit in order to display a floating timer widget. This
            script is limited in what it does:
          </p>
          <Ul>
            <Li>
              <Strong>It does not read page content.</Strong> The script never reads, copies,
              or transmits the text, form inputs, passwords, cookies, or any other content
              from the pages you visit.
            </Li>
            <Li>
              <Strong>It only renders the timer UI.</Strong> Its sole purpose is to inject and
              manage the floating timer overlay so you can start, pause, and stop timers
              without leaving the tab.
            </Li>
            <Li>
              <Strong>It handles authentication messages securely.</Strong> When you are on{' '}
              <Code>w-timer.com</Code>, the script relays sign-in status between the website
              and the extension. This communication is restricted to{' '}
              <Code>https://w-timer.com/*</Code> only and uses no third-party code.
            </Li>
            <Li>
              <Strong>It does not inject third-party tracking scripts</Strong> into the pages
              you visit. The extension enforces a strict Content Security Policy (
              <Code>script-src &apos;self&apos;; object-src &apos;none&apos;</Code>) that
              prevents any external JavaScript from running inside extension contexts.
            </Li>
          </Ul>
          <p>
            The extension declares <Code>content_scripts</Code> on{' '}
            <Code>&lt;all_urls&gt;</Code> but has no <Code>host_permissions</Code>, which
            means it cannot make privileged cross-origin requests on behalf of those pages.
          </p>
        </Section>

        {/* 3. Where data is stored */}
        <Section id="data-storage" title="3. Where your data is stored">
          <p>Work Timer uses two distinct storage tiers:</p>
          <Ul>
            <Li>
              <Strong>chrome.storage.local (local)</Strong> — All time entries, projects,
              tags, settings, and timer state are stored inside Chrome on your own machine.
              This storage is sandboxed to the extension and inaccessible to websites or
              other extensions. No network request is made to store or retrieve this data.
            </Li>
            <Li>
              <Strong>Supabase (cloud, optional)</Strong> — When you sign in and cloud sync
              is enabled, your data is replicated to a PostgreSQL database hosted on Supabase
              (supabase.com). Supabase stores data in data centers operated by AWS or Google
              Cloud. All data is encrypted in transit (TLS) and at rest (AES-256). Supabase
              enforces row-level security so each user can only read their own records.
            </Li>
          </Ul>
          <p>
            Cloud data is logically associated with your account via your user ID. If you
            are in the European Economic Area (EEA), please note that our cloud
            infrastructure may process data outside the EEA; Supabase operates under
            Standard Contractual Clauses for such transfers.
          </p>
        </Section>

        {/* 4. How we use your data */}
        <Section id="how-we-use" title="4. How we use your data">
          <p>We use the data we collect solely to deliver and improve Work Timer:</p>
          <Ul>
            <Li>
              <Strong>Core time-tracking features</Strong> — Recording, displaying, and
              exporting your time entries, projects, and tags.
            </Li>
            <Li>
              <Strong>Cloud sync</Strong> — Replicating your local data to the server
              (and vice versa) so you can use Work Timer on multiple devices.
            </Li>
            <Li>
              <Strong>Notifications &amp; reminders</Strong> — Using the Chrome{' '}
              <Code>notifications</Code> API and <Code>alarms</Code> API to deliver Pomodoro
              transition alerts, idle-time prompts, and optional weekly timesheet reminders.
              You can disable all notifications in Settings.
            </Li>
            <Li>
              <Strong>Idle detection</Strong> — Using Chrome&apos;s <Code>idle</Code> API to
              detect when you step away from your computer. If idle time is detected while a
              timer is running, Work Timer will ask whether to keep or discard the idle
              portion. No data about your idle activity is transmitted to our servers.
            </Li>
            <Li>
              <Strong>Personal analytics (premium)</Strong> — Computing your usage statistics
              (daily averages, project breakdowns, earnings estimates) from your own time
              entries. Results are displayed only to you.
            </Li>
            <Li>
              <Strong>Account management</Strong> — Sending transactional emails (password
              reset, email verification) when you request them.
            </Li>
            <Li>
              <Strong>Subscription management</Strong> — Tracking your plan tier and feature
              entitlements.
            </Li>
          </Ul>
        </Section>

        {/* 5. What we do NOT do */}
        <Section id="what-we-dont-do" title="5. What we do NOT do">
          <p>
            We believe in being explicit about what we will never do with your data:
          </p>
          <Ul>
            <Li>
              <Strong>We do not sell your data.</Strong> Your time entries, projects, tags,
              and usage patterns are never sold or rented to any third party.
            </Li>
            <Li>
              <Strong>We do not read or modify web page content.</Strong> The floating timer
              widget is injected as a content script so it can appear while you browse, but
              it renders only its own UI. It does not read page text, form inputs, passwords,
              cookies, or any other page data (see section 2f for full details).
            </Li>
            <Li>
              <Strong>We do not inject advertising or tracking scripts.</Strong> The
              extension enforces a strict Content Security Policy (
              <Code>script-src &apos;self&apos;; object-src &apos;none&apos;</Code>) that
              prevents any third-party JavaScript from running inside extension pages.
            </Li>
            <Li>
              <Strong>We do not track your browsing history.</Strong> The extension does not
              record which URLs you visit.
            </Li>
            <Li>
              <Strong>We do not share your data with advertisers</Strong> or ad-tech
              platforms.
            </Li>
            <Li>
              <Strong>We do not use your data to train AI or machine learning models.</Strong>
            </Li>
          </Ul>
        </Section>

        {/* 6. Third-party services */}
        <Section id="third-parties" title="6. Third-party services">
          <p>
            Work Timer integrates with a small number of carefully chosen third-party
            services. Each of these has their own privacy policy that governs the data
            they receive:
          </p>
          <Ul>
            <Li>
              <Strong>
                <InlineLink href="https://supabase.com/privacy">Supabase</InlineLink>
              </Strong>{' '}
              — Our database, authentication, and real-time sync provider. When you create
              an account or enable cloud sync, your account information and time tracking
              data are stored in Supabase. Supabase acts as a data processor on our behalf.
            </Li>
            <Li>
              <Strong>
                <InlineLink href="https://stripe.com/privacy">Stripe</InlineLink>
              </Strong>{' '}
              — Our payment processor for premium subscriptions. When you enter payment
              details, they go directly to Stripe. We receive only a subscription status
              token from Stripe. Stripe is PCI DSS compliant.
            </Li>
            <Li>
              <Strong>
                <InlineLink href="https://vercel.com/legal/privacy-policy">Vercel</InlineLink>
              </Strong>{' '}
              — Our web hosting provider for the companion website. Vercel may log request
              metadata (IP address, user-agent) for up to 30 days for security and
              reliability purposes.
            </Li>
            <Li>
              <Strong>Google OAuth (optional)</Strong> — If you choose to sign in with
              Google, Google will share your name and email address with us to create your
              account. We do not request any additional Google permissions.
            </Li>
          </Ul>
          <p>
            We do not use any advertising networks, behavioral analytics platforms, or
            social media tracking pixels on our website or in our extension.
          </p>
        </Section>

        {/* 7. Retention & deletion */}
        <Section id="retention" title="7. Data retention & deletion">
          <H3>Local data (extension)</H3>
          <p>
            Data stored in <Code>chrome.storage.local</Code> is retained until you uninstall
            the extension, clear the extension&apos;s storage via Chrome settings, or use
            the &ldquo;Clear all data&rdquo; option inside Work Timer&apos;s Settings view.
          </p>

          <H3>Cloud data (account)</H3>
          <p>
            If you have an account, your cloud data is retained for as long as your account
            is active. You can delete your account at any time from the Account Settings
            page. Upon deletion:
          </p>
          <Ul>
            <Li>All your time entries, projects, tags, and settings are permanently deleted from our database.</Li>
            <Li>Your authentication record is removed.</Li>
            <Li>Any active subscription is cancelled immediately (you retain access until the end of the current billing period).</Li>
            <Li>Deletion is irreversible. We do not retain soft-deleted copies of your data beyond the backup window described below.</Li>
          </Ul>

          <H3>Backups</H3>
          <p>
            Supabase takes automated database backups. Deleted data may remain in encrypted
            backups for up to 30 days before being permanently overwritten. We will not
            restore your data from backup after you request deletion.
          </p>

          <H3>Data portability</H3>
          <p>
            You can export all your time entries at any time as CSV, Excel (.xlsx), or PDF
            from within the extension or website. You own your data and can take it with you
            at any time.
          </p>
        </Section>

        {/* 8. Security */}
        <Section id="security" title="8. Security">
          <p>
            We take reasonable technical and organisational measures to protect your data:
          </p>
          <Ul>
            <Li>All data is transmitted over HTTPS/TLS.</Li>
            <Li>Cloud data is encrypted at rest using AES-256.</Li>
            <Li>
              Row-level security in the database ensures each user can only access their
              own records.
            </Li>
            <Li>
              The extension enforces a strict Content Security Policy that blocks
              third-party script injection.
            </Li>
            <Li>
              Extension-to-website messaging is restricted via{' '}
              <Code>externally_connectable</Code> to{' '}
              <Code>https://w-timer.com/*</Code>, preventing spoofing from other origins.
            </Li>
            <Li>All API routes validate inputs using strict Zod schemas.</Li>
          </Ul>
          <p>
            No method of transmission or storage is 100% secure. If you discover a
            security vulnerability, please report it responsibly to{' '}
            <InlineLink href="mailto:support@w-timer.com">support@w-timer.com</InlineLink>.
          </p>
        </Section>

        {/* 9. Children's privacy */}
        <Section id="childrens-privacy" title="9. Children's privacy">
          <p>
            Work Timer is not directed at children under the age of 13 (or 16 where
            applicable under local law). We do not knowingly collect personal information
            from children. If you believe a child has provided us with personal information
            without parental consent, please contact us at{' '}
            <InlineLink href="mailto:support@w-timer.com">support@w-timer.com</InlineLink>{' '}
            and we will delete the information promptly.
          </p>
        </Section>

        {/* 10. Changes */}
        <Section id="changes" title="10. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update
            the &ldquo;Last updated&rdquo; date at the top of this page. For material
            changes — those that significantly affect how we process your data — we will
            notify you by email (if you have an account) or by displaying a notice in the
            extension or on the website at least 14 days before the change takes effect.
          </p>
          <p>
            Continuing to use Work Timer after a policy update constitutes your acceptance
            of the revised policy. If you do not agree with the changes, you may delete your
            account and uninstall the extension before the effective date.
          </p>
        </Section>

        {/* 11. Your rights — CHANGE 4: new GDPR-style section */}
        <Section id="your-rights" title="11. Your rights">
          <p>
            Depending on where you live, you may have certain rights over your personal
            data under applicable privacy law (including, where relevant, the GDPR and
            similar regulations). These rights may include:
          </p>
          <Ul>
            <Li>
              <Strong>Right of access</Strong> — You can request a copy of the personal data
              we hold about you.
            </Li>
            <Li>
              <Strong>Right to rectification</Strong> — You can ask us to correct inaccurate
              or incomplete data.
            </Li>
            <Li>
              <Strong>Right to erasure</Strong> — You can request deletion of your personal
              data, subject to any legal obligations we may have to retain it.
            </Li>
            <Li>
              <Strong>Right to restriction</Strong> — You can ask us to limit how we process
              your data in certain circumstances.
            </Li>
            <Li>
              <Strong>Right to data portability</Strong> — You can request your data in a
              structured, machine-readable format. Work Timer supports this directly via the
              CSV and Excel export features.
            </Li>
            <Li>
              <Strong>Right to object</Strong> — You can object to certain types of
              processing, such as direct marketing (we do not send marketing emails).
            </Li>
          </Ul>
          <p>
            Most of these rights can be exercised directly within the app: you can export
            your data at any time, and you can delete your account (and all associated data)
            from the Account Settings page. To exercise any right that is not handled
            in-app, or if you have questions, please contact us using the details in the
            &ldquo;Contact us&rdquo; section below. We will respond within 30 days.
          </p>
          <p>
            If you are in the EEA or UK and believe we have not addressed your concern, you
            have the right to lodge a complaint with your local data protection authority.
          </p>
        </Section>

        {/* 12. Contact — CHANGE 6: added operator sentence */}
        <Section id="contact" title="12. Contact us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy
            or your personal data, please get in touch:
          </p>
          <div className="rounded-xl border border-stone-200 dark:border-[var(--dark-border)] bg-stone-50 dark:bg-[var(--dark-card)] px-6 py-5 mt-4 space-y-1.5 text-stone-700 dark:text-stone-300">
            <p>
              <Strong>Work Timer</Strong>
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-500">
              Operated by{' '}
              <span className="italic">[Your Legal Name / Company Name, Country]</span>
            </p>
            <p>
              Email:{' '}
              <InlineLink href="mailto:support@w-timer.com">support@w-timer.com</InlineLink>
            </p>
            <p>
              Website:{' '}
              <InlineLink href="https://w-timer.com">https://w-timer.com</InlineLink>
            </p>
          </div>
          <p className="mt-4">
            We aim to respond to all privacy-related enquiries within 5 business days.
          </p>
        </Section>

      </article>

      {/* ── Back to top ── */}
      <div className="mt-14 pt-6 border-t border-stone-200 dark:border-[var(--dark-border)] text-center">
        <a
          href="#"
          className="text-sm text-stone-400 dark:text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          ↑ Back to top
        </a>
      </div>
    </div>
  )
}
