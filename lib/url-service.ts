import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { ClickMeta } from '@/lib/request-meta'
import { generateShortCode } from '@/lib/short-code'
import {
  buildClicksByDay,
  DIRECT_REFERRER,
  rankReferrers,
  statsWindowStart,
  type DailyClicks,
  type ReferrerClicks,
} from '@/lib/stats'

export const MAX_CODE_ATTEMPTS = 5

export type ShortUrlRecord = {
  id: number
  code: string
  originalUrl: string
  createdAt: Date
  expiresAt: Date | null
}

export type ShortUrlWithClicks = ShortUrlRecord & { clicks: number }

export type ResolveResult =
  | { status: 'ok'; shortUrl: ShortUrlRecord }
  | { status: 'not_found' }
  | { status: 'expired' }

export type UrlStats = {
  totalClicks: number
  clicksByDay: DailyClicks[]
  topReferrers: ReferrerClicks[]
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

export async function createShortUrl(
  input: { url: string; expiresAt: Date | null },
  generate: () => string = generateShortCode,
): Promise<ShortUrlRecord> {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await prisma.shortUrl.create({
        data: { code: generate(), originalUrl: input.url, expiresAt: input.expiresAt },
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error(`Could not generate a unique short code after ${MAX_CODE_ATTEMPTS} attempts`)
}

export function findByCode(code: string): Promise<ShortUrlRecord | null> {
  return prisma.shortUrl.findUnique({ where: { code } })
}

export async function resolveCode(code: string, now: Date = new Date()): Promise<ResolveResult> {
  const shortUrl = await findByCode(code)
  if (!shortUrl) return { status: 'not_found' }
  if (shortUrl.expiresAt && shortUrl.expiresAt.getTime() <= now.getTime()) return { status: 'expired' }
  return { status: 'ok', shortUrl }
}

export async function recordClick(shortUrlId: number, meta: ClickMeta): Promise<void> {
  await prisma.click.create({ data: { shortUrlId, ...meta } })
}

export async function listUrls(): Promise<ShortUrlWithClicks[]> {
  const rows = await prisma.shortUrl.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { _count: { select: { clicks: true } } },
  })
  return rows.map(({ _count, ...shortUrl }) => ({ ...shortUrl, clicks: _count.clicks }))
}

export async function getStats(code: string, now: Date = new Date()): Promise<UrlStats | null> {
  const shortUrl = await findByCode(code)
  if (!shortUrl) return null

  const where = { shortUrlId: shortUrl.id }
  const [totalClicks, recentClicks, referrerGroups] = await Promise.all([
    prisma.click.count({ where }),
    prisma.click.findMany({
      where: { ...where, createdAt: { gte: statsWindowStart(now) } },
      select: { createdAt: true },
    }),
    prisma.click.groupBy({ by: ['referrer'], where, _count: { _all: true } }),
  ])

  return {
    totalClicks,
    clicksByDay: buildClicksByDay(recentClicks, now),
    topReferrers: rankReferrers(
      referrerGroups.map((g) => ({ referrer: g.referrer ?? DIRECT_REFERRER, count: g._count._all })),
    ),
  }
}
