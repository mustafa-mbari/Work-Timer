const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve static assets (JS/CSS chunks) from the Vercel .vercel.app domain
  // to bypass corporate security proxies (e.g. Zscaler) that block w-timer.com
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set (local dev)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Upload source maps to Sentry for readable stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
})
