/**
 * Strict Content Security Policy for the console pages: scripts and styles
 * run only with the per-request nonce Next.js stamps on its own tags, nothing
 * loads from another origin, and no other site may frame the console.
 */
export function contentSecurityPolicy(nonce: string, options: { dev: boolean }): string {
  const scripts = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`]
  // React rebuilds server error stacks with eval, in development only.
  if (options.dev) scripts.push(`'unsafe-eval'`)
  return [
    `default-src 'self'`,
    `script-src ${scripts.join(' ')}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ')
}

/** 128 random bits, base64: unguessable and unique per response. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}
