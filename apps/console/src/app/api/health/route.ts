import { hubUrl, simulatorHeaders, simulatorUrl } from '@/lib/proxy'

export const dynamic = 'force-dynamic'

async function up(url: string, headers: Record<string, string> = {}): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    })
    return response.ok
  } catch {
    return false
  }
}

/** The console is healthy when the services behind it answer. */
export async function GET() {
  const [hub, simulator] = await Promise.all([
    up(`${hubUrl()}/health`),
    up(`${simulatorUrl()}/health`, simulatorHeaders()),
  ])
  const ok = hub && simulator
  return Response.json(
    { status: ok ? 'ok' : 'degraded', hub, simulator },
    { status: ok ? 200 : 503 },
  )
}
