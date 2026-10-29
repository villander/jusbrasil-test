export const STATS_WINDOW_DAYS = 30
export const DIRECT_REFERRER = 'direct'

const DAY_MS = 24 * 60 * 60 * 1000

export type DailyClicks = { date: string; count: number }
export type ReferrerClicks = { referrer: string; count: number }

const toUtcDay = (date: Date) => date.toISOString().slice(0, 10)

// Start (UTC midnight) of the oldest day included in the stats window
export function statsWindowStart(now: Date = new Date(), days: number = STATS_WINDOW_DAYS): Date {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return new Date(todayStart - (days - 1) * DAY_MS)
}

// Returns one entry per UTC day (YYYY-MM-DD) for the last `days` days, oldest first
export function buildClicksByDay(
  clicks: { createdAt: Date }[],
  now: Date = new Date(),
  days: number = STATS_WINDOW_DAYS,
): DailyClicks[] {
  const start = statsWindowStart(now, days).getTime()
  const counts = new Map<string, number>()
  for (let i = 0; i < days; i++) counts.set(toUtcDay(new Date(start + i * DAY_MS)), 0)

  for (const { createdAt } of clicks) {
    const day = toUtcDay(createdAt)
    const current = counts.get(day)
    if (current !== undefined) counts.set(day, current + 1)
  }

  return Array.from(counts, ([date, count]) => ({ date, count }))
}

const isDirect = (r: ReferrerClicks) => (r.referrer === DIRECT_REFERRER ? 1 : 0)

// Most clicks first; on ties real referrers come before "direct", then alphabetical
export function rankReferrers(counts: ReferrerClicks[], limit = 5): ReferrerClicks[] {
  return [...counts]
    .sort((a, b) => b.count - a.count || isDirect(a) - isDirect(b) || a.referrer.localeCompare(b.referrer))
    .slice(0, limit)
}

export function buildTopReferrers(clicks: { referrer: string | null }[], limit = 5): ReferrerClicks[] {
  const counts = new Map<string, number>()
  for (const { referrer } of clicks) {
    const key = referrer ?? DIRECT_REFERRER
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return rankReferrers(Array.from(counts, ([referrer, count]) => ({ referrer, count })), limit)
}
