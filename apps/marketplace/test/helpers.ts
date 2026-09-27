import type { Deliver, Schedule } from '../src/webhooks.ts'

/** A clock and a task queue that only move when the test says so. */
export function manualTime(start = Date.parse('2026-09-26T10:00:00Z')) {
  let now = start
  let queue: { at: number; task: () => void }[] = []

  const schedule: Schedule = (task, delayMs) => {
    queue.push({ at: now + delayMs, task })
  }

  return {
    now: () => now,
    schedule,
    /** Advances time, running due tasks in chronological order. */
    async advance(ms: number): Promise<void> {
      const target = now + ms
      for (;;) {
        queue.sort((a, b) => a.at - b.at)
        const next = queue[0]
        if (!next || next.at > target) break
        queue = queue.slice(1)
        now = Math.max(now, next.at)
        next.task()
        // Let the async delivery settle before looking at the queue again.
        await new Promise((resolve) => setImmediate(resolve))
      }
      now = target
    },
    get pending(): number {
      return queue.length
    },
  }
}

export interface Captured {
  url: string
  headers: Record<string, string>
  body: string
}

export function recordingDeliver(statuses: number[] = []): { deliver: Deliver; calls: Captured[] } {
  const calls: Captured[] = []
  const deliver: Deliver = (url, headers, body) => {
    calls.push({ url, headers, body })
    return Promise.resolve(statuses[calls.length - 1] ?? 202)
  }
  return { deliver, calls }
}
