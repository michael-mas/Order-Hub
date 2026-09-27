export function money(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100)
}

export function time(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(11, 19)
}

export function ago(iso: string | null, now: number): string {
  if (!iso) return 'never'
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
