import { hubHeaders, hubUrl, relay } from '@/lib/proxy'
import { HUB_ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

async function handle(request: Request, { params }: RouteContext<'/api/hub/[...path]'>) {
  const { path } = await params
  return relay(request, path, { base: hubUrl(), rules: HUB_ROUTES, headers: hubHeaders() })
}

export { handle as GET, handle as POST }
