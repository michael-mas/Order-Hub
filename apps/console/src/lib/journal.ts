import type { JournalEntry } from './hub'

export const JOURNAL_CAPACITY = 300

/**
 * Appends a tail page to what is on screen: no duplicate if a page is fetched
 * twice, oldest entries dropped beyond the capacity.
 */
export function mergeJournal(
  current: readonly JournalEntry[],
  incoming: readonly JournalEntry[],
  capacity = JOURNAL_CAPACITY,
): JournalEntry[] {
  const seen = new Set(current.map((e) => e.id))
  const merged = [...current, ...incoming.filter((e) => !seen.has(e.id))]
  merged.sort((a, b) => Number(a.id) - Number(b.id))
  return merged.slice(-capacity)
}
