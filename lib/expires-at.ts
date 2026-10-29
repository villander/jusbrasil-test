export type ParseExpiresAtResult = { ok: true; value: Date | null } | { ok: false; error: string }

const INVALID_DATE_MESSAGE = 'expiresAt deve ser uma data ISO válida.'
const PAST_DATE_MESSAGE = 'expiresAt deve ser uma data no futuro.'

export function parseExpiresAt(value: unknown, now: Date = new Date()): ParseExpiresAtResult {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, error: INVALID_DATE_MESSAGE }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { ok: false, error: INVALID_DATE_MESSAGE }
  if (date.getTime() <= now.getTime()) return { ok: false, error: PAST_DATE_MESSAGE }

  return { ok: true, value: date }
}
