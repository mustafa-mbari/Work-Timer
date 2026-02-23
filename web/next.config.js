const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all browser Supabase API calls through our own domain.
  // Corporate firewalls often block *.supabase.co; routing via /supabase-proxy
  // means the browser only ever talks to our domain.
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`,
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)
