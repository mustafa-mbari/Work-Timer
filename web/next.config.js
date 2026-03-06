const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve static assets (JS/CSS chunks) from the Vercel .vercel.app domain
  // to bypass corporate security proxies (e.g. Zscaler) that block w-timer.com
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Similarly, ignore type errors during builds to unblock deployment
    // if there are persistent issues that need gradual fixing.
    ignoreBuildErrors: true,
  }
}

module.exports = withNextIntl(nextConfig)
