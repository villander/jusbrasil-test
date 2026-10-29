import type { ShortUrlRecord } from '@/lib/url-service'

export type ShortUrlDto = {
  shortCode: string
  shortUrl: string
  originalUrl: string
  createdAt: string
  expiresAt: string | null
}

// BASE_URL is only honored when absolute; Vite/Vitest set it to "/" by default
function configuredOrigin(): string | null {
  const base = process.env.BASE_URL
  return base && /^https?:\/\//i.test(base) ? base.replace(/\/+$/, '') : null
}

export function publicOrigin(requestUrl: string): string {
  return configuredOrigin() ?? new URL(requestUrl).origin
}

// For Server Components, which have request headers but no request URL
export function originFromHeaders(headers: Headers): string {
  const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http'
  return configuredOrigin() ?? `${proto}://${headers.get('host')}`
}

export function toShortUrlDto(record: ShortUrlRecord, origin: string): ShortUrlDto {
  return {
    shortCode: record.code,
    shortUrl: `${origin}/${record.code}`,
    originalUrl: record.originalUrl,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
  }
}
