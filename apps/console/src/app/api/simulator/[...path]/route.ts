import { relay, simulatorHeaders, simulatorUrl } from '@/lib/proxy'
import { SIMULATOR_ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

async function handle(request: Request, { params }: RouteContext<'/api/simulator/[...path]'>) {
  const { path } = await params
  return relay(request, path, {
    base: simulatorUrl(),
    rules: SIMULATOR_ROUTES,
    headers: simulatorHeaders(),
  })
}

export { handle as GET, handle as POST, handle as PUT }
