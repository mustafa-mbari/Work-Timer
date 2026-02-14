import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable transpilation of shared workspace packages
  transpilePackages: [],
  // Disable ESLint during builds (already have type-checking)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
