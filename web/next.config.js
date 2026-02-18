const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname
    return config
  },
}

module.exports = nextConfig
