import { describe, expect, it } from 'vitest'
import { parseExpiresAt } from '@/lib/expires-at'

const now = new Date('2026-10-29T12:00:00.000Z')

describe('parseExpiresAt', () => {
  it.each([undefined, null, ''])('treats %j as no expiration', (value) => {
    expect(parseExpiresAt(value, now)).toEqual({ ok: true, value: null })
  })

  it('accepts a future ISO date', () => {
    expect(parseExpiresAt('2026-10-30T12:00:00.000Z', now)).toEqual({
      ok: true,
      value: new Date('2026-10-30T12:00:00.000Z'),
    })
  })

  it.each([
    ['a past date', '2026-10-28T12:00:00.000Z'],
    ['exactly now', '2026-10-29T12:00:00.000Z'],
    ['an invalid string', 'tomorrow'],
    ['a number', 1234],
    ['an object', {}],
  ])('rejects %s', (_label, value) => {
    const result = parseExpiresAt(value, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toEqual(expect.any(String))
  })
})
