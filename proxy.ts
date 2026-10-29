import { NextResponse, type NextRequest } from 'next/server'
import { findByCode } from '@/lib/url-service'

export const config = {
  matcher: '/analytics/:code',
}

// The analytics page streams, so its status is fixed before notFound() can run.
// Checking the code here lets unknown codes get a real 404 status (with app/not-found.tsx).
export async function proxy(request: NextRequest) {
  const code = decodeURIComponent(request.nextUrl.pathname.split('/')[2] ?? '')
  if (await findByCode(code)) return NextResponse.next()
  return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
}
