import { money, time } from '@/lib/format'
import type { Order } from '@/lib/hub'
import { ErrorNote, Panel } from './ui'

const STATUS: Record<string, string> = {
  new: 'text-info',
  accepted: 'text-text',
  shipped: 'text-accent',
  cancelled: 'text-faint',
}

export function RecentOrders({ orders, error }: { orders: Order[] | null; error: string | null }) {
  return (
    <Panel title="Latest changes" id="orders">
      <ErrorNote message={error} />
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Latest changes, scrollable"
      >
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Orders most recently created or updated</caption>
          <thead className="text-faint">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2 font-normal">
                Order
              </th>
              <th scope="col" className="px-2 py-2 font-normal">
                Status
              </th>
              <th scope="col" className="px-2 py-2 text-right font-normal">
                Total
              </th>
              <th scope="col" className="px-2 py-2 text-right font-normal">
                Version
              </th>
              <th scope="col" className="px-2 py-2 font-normal">
                First seen via
              </th>
              <th scope="col" className="px-2 py-2 font-normal">
                Ack
              </th>
              <th scope="col" className="px-4 py-2 text-right font-normal">
                Changed
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {orders?.map((o) => (
              <tr key={o.id} className="border-b border-line/60 last:border-b-0">
                <td className="px-4 py-2 whitespace-nowrap">{o.externalId}</td>
                <td className={`px-2 py-2 ${STATUS[o.status] ?? 'text-text'}`}>{o.status}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(o.totalMinor, o.currency)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">v{o.version}</td>
                <td className="px-2 py-2 text-muted">{o.firstSource}</td>
                <td className="px-2 py-2">
                  {o.acknowledgedAt ? (
                    <span className="text-accent">yes</span>
                  ) : (
                    <span className="text-faint">pending</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-muted tabular-nums">
                  {time(o.lastChangedAt)}
                </td>
              </tr>
            ))}
            {orders?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 font-sans text-sm text-muted">
                  No order yet. The simulator creates some every few seconds.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
