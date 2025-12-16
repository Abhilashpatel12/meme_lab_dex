import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Silence “inferred workspace root” warnings when the repo has lockfiles above this folder
  outputFileTracingRoot: __dirname,
  // Turbopack config (Next.js 16+ uses Turbopack by default)
  turbopack: {},
  // 1. Critical: Exclude these packages from bundling
  serverExternalPackages: ["@irys/sdk", "csv-parse", "csv-stringify"],

  // 2. Allow images from Arweave/Irys gateways
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.irys.xyz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.arweave.net',
        pathname: '/**',
      },
    ],
  },

  // 3. Webpack fallbacks and externals for Solana/Crypto libraries
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
}

export default nextConfig
