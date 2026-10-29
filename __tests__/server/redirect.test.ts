import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDatabase } from '../helpers/db'
import { GET } from '@/app/[code]/route'
import { createShortUrl } from '@/lib/url-service'

const visit = (code: string, headers: Record<string, string> = {}) =>
  GET(new Request(`http://localhost/${code}`, { headers }), { params: Promise.resolve({ code }) })

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /:code', () => {
  it('redirects with 301 to the original url', async () => {
    const created = await createShortUrl({ url: 'https://example.com/some/path?q=1', expiresAt: null })

    const res = await visit(created.code)

    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://example.com/some/path?q=1')
  })

  it('records a click with referrer, user-agent, ip and timestamp', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })

    await visit(created.code, {
      referer: 'https://google.com/',
      'user-agent': 'Mozilla/5.0 Test',
      'x-forwarded-for': '203.0.113.5, 10.0.0.1',
    })

    const clicks = await prisma.click.findMany({ where: { shortUrlId: created.id } })
    expect(clicks).toHaveLength(1)
    expect(clicks[0]).toMatchObject({
      referrer: 'https://google.com/',
      userAgent: 'Mozilla/5.0 Test',
      ip: '203.0.113.5',
    })
    expect(clicks[0].createdAt).toBeInstanceOf(Date)
  })

  it('records one click per access', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })

    await visit(created.code)
    await visit(created.code)

    expect(await prisma.click.count({ where: { shortUrlId: created.id } })).toBe(2)
  })

  it('returns 404 for an unknown code', async () => {
    const res = await visit('nope123')
    expect(res.status).toBe(404)
    expect(await prisma.click.count()).toBe(0)
  })

  it('returns 410 for an expired code and does not redirect', async () => {
    await prisma.shortUrl.create({
      data: { code: 'EXPIRED', originalUrl: 'https://example.com/', expiresAt: new Date(Date.now() - 1000) },
    })

    const res = await visit('EXPIRED')

    expect(res.status).toBe(410)
    expect(res.headers.get('location')).toBeNull()
    expect(await prisma.click.count()).toBe(0)
  })

  it('does not allow caching of the redirect', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })
    const res = await visit(created.code)
    expect(res.headers.get('cache-control')).toContain('no-store')
  })
})
