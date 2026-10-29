import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { GET } from '@/app/api/stats/[code]/route'
import { createShortUrl, recordClick } from '@/lib/url-service'

const getStats = (code: string) =>
  GET(new Request(`http://localhost/api/stats/${code}`), { params: Promise.resolve({ code }) })

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/stats/:code', () => {
  it('returns totalClicks, clicksByDay (30 days) and topReferrers', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })
    await recordClick(created.id, { referrer: 'https://a.com/', userAgent: null, ip: null })
    await recordClick(created.id, { referrer: null, userAgent: null, ip: null })

    const res = await getStats(created.code)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalClicks).toBe(2)
    expect(body.clicksByDay).toHaveLength(30)
    expect(body.clicksByDay.at(-1)).toEqual({ date: new Date().toISOString().slice(0, 10), count: 2 })
    expect(body.topReferrers).toEqual([
      { referrer: 'https://a.com/', count: 1 },
      { referrer: 'direct', count: 1 },
    ])
  })

  it('returns 404 for an unknown code', async () => {
    const res = await getStats('nope123')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: expect.any(String) })
  })
})
