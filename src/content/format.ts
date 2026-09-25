const monthYear = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2022-09-06" → "sept. 2022". Dates are stored, durations never are. */
export function formatMonthYear(iso: string): string {
  return monthYear.format(new Date(`${iso.slice(0, 7)}-01T00:00:00Z`))
}
