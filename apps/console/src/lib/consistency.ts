/**
 * The "exactly once" verdict: the simulator's ground truth against what the
 * hub holds. Pure, so the console, the tests and the resilience check share it.
 */
export interface TruthOrder {
  channel: string
  id: string
  version: number
  acknowledgedRef: string | null
}

export interface HubOrder {
  channel: string
  externalId: string
  version: number
  id: string
}

export interface Consistency {
  expected: number
  stored: number
  missing: string[]
  behind: string[]
  unacknowledged: string[]
  wrongReference: string[]
  unexpected: string[]
  consistent: boolean
}

export function compare(truth: readonly TruthOrder[], hub: readonly HubOrder[]): Consistency {
  const stored = new Map(hub.map((o) => [`${o.channel}/${o.externalId}`, o]))
  const expectedKeys = new Set<string>()
  const missing: string[] = []
  const behind: string[] = []
  const unacknowledged: string[] = []
  const wrongReference: string[] = []

  for (const t of truth) {
    const key = `${t.channel}/${t.id}`
    expectedKeys.add(key)
    const h = stored.get(key)
    if (!h) {
      missing.push(key)
      continue
    }
    if (h.version < t.version) behind.push(key)
    if (t.acknowledgedRef === null) unacknowledged.push(key)
    else if (t.acknowledgedRef !== h.id) wrongReference.push(key)
  }
  const unexpected = [...stored.keys()].filter((k) => !expectedKeys.has(k))

  return {
    expected: truth.length,
    stored: hub.length,
    missing,
    behind,
    unacknowledged,
    wrongReference,
    unexpected,
    consistent:
      missing.length +
        behind.length +
        unacknowledged.length +
        wrongReference.length +
        unexpected.length ===
      0,
  }
}
