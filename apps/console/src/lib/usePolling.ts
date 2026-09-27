'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface Polled<T> {
  data: T | null
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Polls while the tab is visible, never overlapping two requests. Keeps the
 * last good data when a request fails, and says so.
 */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number): Polled<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef(load)
  const inFlight = useRef(false)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setData(await loadRef.current())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unavailable')
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, intervalMs)
    return () => clearInterval(timer)
  }, [refresh, intervalMs])

  return { data, error, refresh }
}
