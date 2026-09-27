import path from 'node:path'
import type { NextConfig } from 'next'

// The console lives in an npm workspace: tracing and bundling start at the
// repository root, so the standalone output is the same on every machine.
const root = path.join(import.meta.dirname, '../..')

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: root,
  turbopack: { root },
  poweredByHeader: false,
  reactStrictMode: true,
}

export default config
