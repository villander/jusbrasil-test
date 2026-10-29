export type ClickMeta = {
  referrer: string | null
  userAgent: string | null
  ip: string | null
}

// request.ip was removed in Next 15, so the client IP comes from proxy headers
function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || null
}

export function extractClickMeta(headers: Headers): ClickMeta {
  return {
    referrer: headers.get('referer') || null,
    userAgent: headers.get('user-agent') || null,
    ip: clientIp(headers),
  }
}
