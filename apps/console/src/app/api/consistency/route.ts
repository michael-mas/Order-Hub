import { z } from 'zod'
import { compare, type HubOrder, type TruthOrder } from '@/lib/consistency'
import { hubUrl, simulatorHeaders, simulatorUrl } from '@/lib/proxy'

export const dynamic = 'force-dynamic'

const truthSchema = z.object({
  orders: z.array(
    z.object({
      order: z.object({ id: z.string(), version: z.number() }),
      acknowledgedRef: z.string().nullable(),
    }),
  ),
})
const hubPageSchema = z.array(
  z.object({ id: z.string(), channel: z.string(), externalId: z.string(), version: z.number() }),
)
const PAGE = 100
const MAX_PAGES = 50

async function json(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: 'application/json', ...headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.json()
}

/** Compares the simulator's ground truth with every order the hub holds. */
export async function GET() {
  try {
    const truth: TruthOrder[] = []
    for (const channel of ['nova', 'atlas']) {
      const data = truthSchema.parse(
        await json(`${simulatorUrl()}/control/marketplaces/${channel}/orders`, simulatorHeaders()),
      )
      truth.push(
        ...data.orders.map((o) => ({
          channel,
          id: o.order.id,
          version: o.order.version,
          acknowledgedRef: o.acknowledgedRef,
        })),
      )
    }

    const hub: HubOrder[] = []
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const rows = hubPageSchema.parse(
        await json(`${hubUrl()}/api/orders?itemsPerPage=${PAGE}&page=${page}&order[id]=asc`),
      )
      hub.push(...rows)
      if (rows.length < PAGE) break
    }

    return Response.json(compare(truth, hub))
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unavailable' },
      { status: 502 },
    )
  }
}
