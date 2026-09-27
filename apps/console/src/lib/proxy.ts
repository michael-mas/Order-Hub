import 'server-only'
import { isAllowed } from './routes'

type Rules = Parameters<typeof isAllowed>[0]

const TIMEOUT_MS = 70_000

/**
 * Relays an allowed call to an upstream service, server side: upstream URLs
 * and tokens never reach the browser.
 */
export async function relay(
  request: Request,
  segments: string[],
  options: { base: string; rules: Rules; headers?: Record<string, string> },
): Promise<Response> {
  if (!isAllowed(options.rules, request.method, segments)) {
    return Response.json({ error: 'Not available from the console.' }, { status: 404 })
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
  if (request.method !== 'GET') {
    const body = await request.text()
    if (body !== '') {
      init.body = body
      init.headers = { ...init.headers, 'content-type': 'application/json' }
    }
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
