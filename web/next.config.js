const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve static assets (JS/CSS chunks) from the Vercel .vercel.app domain
  // to bypass corporate security proxies (e.g. Zscaler) that block w-timer.com
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
}

module.exports = withNextIntl(nextConfig)
