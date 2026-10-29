import { NextResponse } from 'next/server'
import { getStats } from '@/lib/url-service'

export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const stats = await getStats(code)
  if (!stats) return NextResponse.json({ error: 'URL encurtada não encontrada.' }, { status: 404 })
  return NextResponse.json(stats)
}
