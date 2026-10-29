import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetDatabase } from '../helpers/db'
import {
  createShortUrl,
  getStats,
  listUrls,
  MAX_CODE_ATTEMPTS,
  recordClick,
  resolveCode,
} from '@/lib/url-service'

const noMeta = { referrer: null, userAgent: null, ip: null }
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

beforeEach(async () => {
  await resetDatabase()
})

describe('createShortUrl', () => {
  it('persists the url with a 7-char code', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })

    expect(created.code).toMatch(/^[A-Za-z0-9]{7}$/)
    expect(created.originalUrl).toBe('https://example.com/')
    expect(created.expiresAt).toBeNull()
    expect(created.createdAt).toBeInstanceOf(Date)
    expect(await prisma.shortUrl.count()).toBe(1)
  })

  it('stores expiresAt when given', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z')
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt })
    expect(created.expiresAt).toEqual(expiresAt)
  })

  it('retries with a new code when the generated one already exists', async () => {
    await prisma.shortUrl.create({ data: { code: 'AAAAAAA', originalUrl: 'https://taken.com/' } })
    const generate = vi.fn().mockReturnValueOnce('AAAAAAA').mockReturnValueOnce('AAAAAAA').mockReturnValue('BBBBBBB')

    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null }, generate)

    expect(created.code).toBe('BBBBBBB')
    expect(generate).toHaveBeenCalledTimes(3)
  })

  it('gives up after the maximum number of attempts', async () => {
    await prisma.shortUrl.create({ data: { code: 'AAAAAAA', originalUrl: 'https://taken.com/' } })
    const generate = vi.fn().mockReturnValue('AAAAAAA')

    await expect(createShortUrl({ url: 'https://example.com/', expiresAt: null }, generate)).rejects.toThrow()
    expect(generate).toHaveBeenCalledTimes(MAX_CODE_ATTEMPTS)
  })
})

describe('resolveCode', () => {
  it('returns ok for an existing, non-expired code', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })
    const result = await resolveCode(created.code)

    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.shortUrl.originalUrl).toBe('https://example.com/')
  })

  it('returns not_found for an unknown code', async () => {
    expect(await resolveCode('nope123')).toEqual({ status: 'not_found' })
  })

  it('returns expired when expiresAt is in the past', async () => {
    await prisma.shortUrl.create({
      data: { code: 'EXPIRED', originalUrl: 'https://example.com/', expiresAt: daysAgo(1) },
    })
    expect(await resolveCode('EXPIRED')).toEqual({ status: 'expired' })
  })

  it('returns ok when expiresAt is still in the future', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: new Date(Date.now() + 60_000) })
    expect((await resolveCode(created.code)).status).toBe('ok')
  })
})

describe('recordClick', () => {
  it('stores referrer, user-agent, ip and timestamp', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })

    await recordClick(created.id, { referrer: 'https://google.com/', userAgent: 'UA', ip: '203.0.113.5' })

    const [click] = await prisma.click.findMany({ where: { shortUrlId: created.id } })
    expect(click).toMatchObject({ referrer: 'https://google.com/', userAgent: 'UA', ip: '203.0.113.5' })
    expect(click.createdAt).toBeInstanceOf(Date)
  })
})

describe('listUrls', () => {
  it('returns urls newest first with their click counts', async () => {
    const first = await createShortUrl({ url: 'https://first.com/', expiresAt: null })
    const second = await createShortUrl({ url: 'https://second.com/', expiresAt: null })
    await recordClick(first.id, noMeta)
    await recordClick(first.id, noMeta)

    const urls = await listUrls()

    expect(urls.map((u) => u.code)).toEqual([second.code, first.code])
    expect(urls.map((u) => u.clicks)).toEqual([0, 2])
  })

  it('returns an empty list when there are no urls', async () => {
    expect(await listUrls()).toEqual([])
  })
})

describe('getStats', () => {
  it('returns null for an unknown code', async () => {
    expect(await getStats('nope123')).toBeNull()
  })

  it('aggregates total clicks, clicks by day and top referrers', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })
    await recordClick(created.id, { ...noMeta, referrer: 'https://a.com/' })
    await recordClick(created.id, { ...noMeta, referrer: 'https://a.com/' })
    await recordClick(created.id, noMeta)

    const stats = await getStats(created.code)

    expect(stats?.totalClicks).toBe(3)
    expect(stats?.clicksByDay).toHaveLength(30)
    expect(stats?.clicksByDay.at(-1)).toEqual({ date: new Date().toISOString().slice(0, 10), count: 3 })
    expect(stats?.topReferrers).toEqual([
      { referrer: 'https://a.com/', count: 2 },
      { referrer: 'direct', count: 1 },
    ])
  })

  it('counts all-time clicks in the total but only the last 30 days by day', async () => {
    const created = await createShortUrl({ url: 'https://example.com/', expiresAt: null })
    await prisma.click.create({ data: { shortUrlId: created.id, createdAt: daysAgo(40) } })
    await recordClick(created.id, noMeta)

    const stats = await getStats(created.code)

    expect(stats?.totalClicks).toBe(2)
    expect(stats?.clicksByDay.reduce((sum, d) => sum + d.count, 0)).toBe(1)
  })

  it('does not mix clicks from other urls', async () => {
    const a = await createShortUrl({ url: 'https://a.com/', expiresAt: null })
    const b = await createShortUrl({ url: 'https://b.com/', expiresAt: null })
    await recordClick(b.id, noMeta)

    expect((await getStats(a.code))?.totalClicks).toBe(0)
  })
})
