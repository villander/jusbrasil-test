import { describe, expect, it } from 'vitest'
import { buildClicksByDay, buildTopReferrers, DIRECT_REFERRER } from '@/lib/stats'

const now = new Date('2026-10-29T15:00:00.000Z')
const at = (iso: string) => ({ createdAt: new Date(iso) })

describe('buildClicksByDay', () => {
  it('returns the last 30 UTC days, oldest first, filled with zeros', () => {
    const days = buildClicksByDay([], now)

    expect(days).toHaveLength(30)
    expect(days[0]).toEqual({ date: '2026-09-30', count: 0 })
    expect(days[29]).toEqual({ date: '2026-10-29', count: 0 })
    expect(days.every((d) => d.count === 0)).toBe(true)
  })

  it('groups clicks by UTC day', () => {
    const days = buildClicksByDay(
      [at('2026-10-29T00:00:01.000Z'), at('2026-10-29T14:59:00.000Z'), at('2026-10-27T23:59:59.000Z')],
      now,
    )

    expect(days.find((d) => d.date === '2026-10-29')?.count).toBe(2)
    expect(days.find((d) => d.date === '2026-10-27')?.count).toBe(1)
    expect(days.find((d) => d.date === '2026-10-28')?.count).toBe(0)
  })

  it('includes the first day of the window and ignores clicks before it', () => {
    const days = buildClicksByDay([at('2026-09-30T00:00:00.000Z'), at('2026-09-29T23:59:59.000Z')], now)

    expect(days[0]).toEqual({ date: '2026-09-30', count: 1 })
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(1)
  })
})

describe('buildTopReferrers', () => {
  it('counts referrers, labels missing ones as direct and sorts by count desc', () => {
    const result = buildTopReferrers([
      { referrer: 'https://a.com/' },
      { referrer: null },
      { referrer: 'https://b.com/' },
      { referrer: 'https://b.com/' },
      { referrer: null },
      { referrer: 'https://b.com/' },
    ])

    expect(result).toEqual([
      { referrer: 'https://b.com/', count: 3 },
      { referrer: DIRECT_REFERRER, count: 2 },
      { referrer: 'https://a.com/', count: 1 },
    ])
  })

  it('limits the number of referrers', () => {
    const clicks = ['a', 'b', 'c', 'd', 'e', 'f'].map((r) => ({ referrer: `https://${r}.com/` }))
    expect(buildTopReferrers(clicks)).toHaveLength(5)
    expect(buildTopReferrers(clicks, 2)).toHaveLength(2)
  })

  it('returns an empty list without clicks', () => {
    expect(buildTopReferrers([])).toEqual([])
  })
})
