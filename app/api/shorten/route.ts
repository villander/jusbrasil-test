import { NextResponse } from 'next/server'
import { parseExpiresAt } from '@/lib/expires-at'
import { publicOrigin, toShortUrlDto } from '@/lib/url-response'
import { createShortUrl } from '@/lib/url-service'
import { INVALID_URL_MESSAGE, validateUrl } from '@/lib/validate-url'

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Corpo da requisição deve ser um JSON válido.')
  }

  const { url, expiresAt } = (body ?? {}) as { url?: unknown; expiresAt?: unknown }
  if (typeof url !== 'string') return badRequest(INVALID_URL_MESSAGE)

  const validated = validateUrl(url)
  if (!validated.ok) return badRequest(validated.error)

  const expiration = parseExpiresAt(expiresAt)
  if (!expiration.ok) return badRequest(expiration.error)

  const created = await createShortUrl({ url: validated.url, expiresAt: expiration.value })
  return NextResponse.json(toShortUrlDto(created, publicOrigin(request.url)), { status: 201 })
}
