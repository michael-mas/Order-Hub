import 'server-only'
import { isCrossSite, readLimited } from './guard'
import { createLimiter, limitsFromEnv, type Limit } from './limits'
import { match, type Rule } from './routes'

const TIMEOUT_MS = 70_000

/** One set of buckets per console process: the public demo runs a single one. */
const limiter = createLimiter(limitsFromEnv(process.env))

/** A 429 when the given limit is spent, else null (and the token is taken). */
export function throttle(limit: Limit): Response | null {
  const wait = limiter.take(limit)
  if (wait === 0) return null
  const seconds = Math.max(1, Math.ceil(wait / 1000))
  return Response.json(
    { error: `The public demo limits this action. Try again in ${seconds} s.` },
    { status: 429, headers: { 'retry-after': String(seconds) } },
  )
}

/**
 * Relays an allowed call to an upstream service, server side: upstream URLs
 * and tokens never reach the browser.
 */
export async function relay(
  request: Request,
  segments: string[],
  options: { base: string; rules: readonly Rule[]; headers?: Record<string, string> },
): Promise<Response> {
  const rule = match(options.rules, request.method, segments)
  if (rule === null) {
    return Response.json({ error: 'Not available from the console.' }, { status: 404 })
  }

  let body = ''
  if (request.method !== 'GET') {
    if (isCrossSite(request)) {
      return Response.json({ error: 'Cross-site request refused.' }, { status: 403 })
    }
    const text = await readLimited(request)
    if (text === null) {
      return Response.json({ error: 'Request body too large.' }, { status: 413 })
    }
    body = text
  }
  if (rule.limit !== undefined) {
    const refused = throttle(rule.limit)
    if (refused !== null) return refused
  }

  const target = new URL(
    segments.join('/'),
    options.base.endsWith('/') ? options.base : `${options.base}/`,
  )
  target.search = new URL(request.url).search

  const init: RequestInit = {
    method: request.method,
    headers: { accept: 'application/json', ...options.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }
  if (body !== '') {
    init.body = body
    init.headers = { ...init.headers, 'content-type': 'application/json' }
  }

  try {
    const upstream = await fetch(target, init)
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return Response.json({ error: 'Upstream unreachable.' }, { status: 502 })
  }
}

export const hubUrl = (): string => process.env.HUB_URL ?? 'http://127.0.0.1:8000'
export const simulatorUrl = (): string => process.env.SIMULATOR_URL ?? 'http://127.0.0.1:8100'
export const simulatorHeaders = (): Record<string, string> =>
  process.env.SIMULATOR_CONTROL_TOKEN
    ? { 'x-control-token': process.env.SIMULATOR_CONTROL_TOKEN }
    : {}
