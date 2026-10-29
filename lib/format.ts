const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
})

// "2026-10-29" -> "29/10/2026"
export function formatDay(isoDay: string): string {
  return isoDay.split('-').reverse().join('/')
}

export function formatDateTime(date: Date): string {
  return `${dateTimeFormat.format(date)} UTC`
}
