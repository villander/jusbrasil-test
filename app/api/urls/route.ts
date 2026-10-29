import { NextResponse } from 'next/server'
import { publicOrigin, toShortUrlDto } from '@/lib/url-response'
import { listUrls } from '@/lib/url-service'

export async function GET(request: Request) {
  const origin = publicOrigin(request.url)
  const urls = await listUrls()
  return NextResponse.json({
    urls: urls.map((url) => ({ ...toShortUrlDto(url, origin), clicks: url.clicks })),
  })
}
