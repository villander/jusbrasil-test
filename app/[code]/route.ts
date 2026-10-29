import { NextResponse } from 'next/server'
import { extractClickMeta } from '@/lib/request-meta'
import { recordClick, resolveCode } from '@/lib/url-service'

const NO_STORE = { 'cache-control': 'no-store' }

const textResponse = (body: string, status: number) =>
  new Response(body, { status, headers: { ...NO_STORE, 'content-type': 'text/plain; charset=utf-8' } })

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const result = await resolveCode(code)

  if (result.status === 'not_found') return textResponse('Link não encontrado.', 404)
  if (result.status === 'expired') return textResponse('Este link expirou.', 410)

  await recordClick(result.shortUrl.id, extractClickMeta(request.headers))
  return NextResponse.redirect(result.shortUrl.originalUrl, { status: 301, headers: NO_STORE })
}
