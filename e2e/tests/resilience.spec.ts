import { expect, test } from '@playwright/test'

/**
 * The claim of the project, tested end to end: under the "storm" preset
 * (lost, duplicated and reordered webhooks, late listings, quotas, 503s),
 * once the faults stop, every order of the marketplace ends up stored once,
 * at its latest version, and acknowledged once with the hub's reference.
 */
const SIMULATOR = 'http://127.0.0.1:8100'
const STORM_MS = Number(process.env.STORM_MS ?? 60_000)

interface Consistency {
  expected: number
  stored: number
  missing: string[]
  behind: string[]
  unacknowledged: string[]
  wrongReference: string[]
  unexpected: string[]
  consistent: boolean
}

test('every order is stored and acknowledged exactly once after a storm', async ({ request }) => {
  test.setTimeout(STORM_MS + 6 * 60_000)

  for (const channel of ['nova', 'atlas']) {
    expect(
      (await request.put(`${SIMULATOR}/control/marketplaces/${channel}/preset/storm`)).ok(),
    ).toBe(true)
  }
  await new Promise((resolve) => setTimeout(resolve, STORM_MS))
  for (const channel of ['nova', 'atlas']) {
    await request.put(`${SIMULATOR}/control/marketplaces/${channel}/preset/calm`)
    await request.patch(`${SIMULATOR}/control/marketplaces/${channel}/chaos`, {
      data: { generation: { ordersPerMinute: 0, updatesPerMinute: 0 } },
    })
  }

  let last: Consistency | null = null
  // Polls until consistent; on timeout, the last divergence is the received value.
  await expect
    .poll(
      async () => {
        // An operator would press "Replay all"; so does the test.
        await request.post('/api/hub/api/failed-messages/replay')
        const response = await request.get('/api/consistency')
        const report = (await response.json()) as Consistency
        last = report
        return report.consistent
          ? 'consistent'
          : JSON.stringify({
              expected: report.expected,
              stored: report.stored,
              missing: report.missing.slice(0, 10),
              behind: report.behind.slice(0, 10),
              unacknowledged: report.unacknowledged.slice(0, 10),
              wrongReference: report.wrongReference.slice(0, 10),
              unexpected: report.unexpected.slice(0, 10),
            })
      },
      { timeout: 5 * 60_000, intervals: [5_000] },
    )
    .toBe('consistent')

  const result = last as unknown as Consistency
  test
    .info()
    .annotations.push({ type: 'orders', description: `${result.expected} orders reconciled` })
  expect(result.expected).toBeGreaterThan(20)
  expect(result.stored).toBe(result.expected)
})
