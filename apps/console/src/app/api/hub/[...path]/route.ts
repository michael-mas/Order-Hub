import { createCooldown } from '@/lib/cooldown'
import { hubUrl, relay } from '@/lib/proxy'
import { HUB_ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

const analysisCooldown = createCooldown(Number(process.env.ANALYSIS_COOLDOWN_MS ?? 15_000))

async function handle(request: Request, { params }: RouteContext<'/api/hub/[...path]'>) {
  const { path } = await params
  if (request.method === 'POST' && path.join('/') === 'api/incident-analyses') {
    const wait = analysisCooldown.take()
    if (wait > 0) {
      return Response.json(
        { error: `An analysis was just produced. Try again in ${Math.ceil(wait / 1000)} s.` },
        { status: 429, headers: { 'retry-after': String(Math.ceil(wait / 1000)) } },
      )
    }
  }
  return relay(request, path, { base: hubUrl(), rules: HUB_ROUTES })
}

export { handle as GET, handle as POST }
