import path from 'node:path'
import type { NextConfig } from 'next'

// The console lives in an npm workspace: tracing and bundling start at the
// repository root, so the standalone output is the same on every machine.
const root = path.join(import.meta.dirname, '../..')

/** Sent with every response; the pages add their nonce-based CSP (src/proxy.ts). */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // Ignored over plain HTTP (local runs); the public demo is served over HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: root,
  turbopack: { root },
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    { source: '/:path*', headers: securityHeaders },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
  ],
}

export default config
