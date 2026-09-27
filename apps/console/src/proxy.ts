import { NextResponse, type NextRequest } from 'next/server'
import { contentSecurityPolicy, createNonce } from '@/lib/csp'

/**
 * Gives every page render its own nonce: Next.js reads it from the request's
 * Content-Security-Policy header and stamps it on the scripts and styles it
 * emits. The other security headers are static (next.config.ts).
 */
export function proxy(request: NextRequest) {
  const policy = contentSecurityPolicy(createNonce(), {
    dev: process.env.NODE_ENV === 'development',
  })
  const headers = new Headers(request.headers)
  headers.set('content-security-policy', policy)

  const response = NextResponse.next({ request: { headers } })
  response.headers.set('content-security-policy', policy)
  return response
}

export const config = {
  matcher: [
    {
      // Pages only: API routes answer JSON, static assets carry no markup.
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
