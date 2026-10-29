import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { GET } from '@/app/api/urls/route'
import { createShortUrl, recordClick } from '@/lib/url-service'

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/urls', () => {
  it('lists urls newest first with click counts', async () => {
    const first = await createShortUrl({ url: 'https://first.com/', expiresAt: null })
    const second = await createShortUrl({ url: 'https://second.com/', expiresAt: new Date('2030-01-01T00:00:00.000Z') })
    await recordClick(first.id, { referrer: null, userAgent: null, ip: null })

    const res = await GET(new Request('http://localhost/api/urls'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      urls: [
        {
          shortCode: second.code,
          shortUrl: `http://localhost/${second.code}`,
          originalUrl: 'https://second.com/',
          createdAt: second.createdAt.toISOString(),
          expiresAt: '2030-01-01T00:00:00.000Z',
          clicks: 0,
        },
        {
          shortCode: first.code,
          shortUrl: `http://localhost/${first.code}`,
          originalUrl: 'https://first.com/',
          createdAt: first.createdAt.toISOString(),
          expiresAt: null,
          clicks: 1,
        },
      ],
    })
  })

  it('returns an empty list', async () => {
    const res = await GET(new Request('http://localhost/api/urls'))
    expect(await res.json()).toEqual({ urls: [] })
  })
})
