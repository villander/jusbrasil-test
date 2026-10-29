import { describe, expect, it } from 'vitest'
import { extractClickMeta } from '@/lib/request-meta'

describe('extractClickMeta', () => {
  it('reads referrer, user-agent and the first x-forwarded-for address', () => {
    const headers = new Headers({
      referer: 'https://google.com/search',
      'user-agent': 'Mozilla/5.0 Test',
      'x-forwarded-for': '203.0.113.5, 10.0.0.1',
    })

    expect(extractClickMeta(headers)).toEqual({
      referrer: 'https://google.com/search',
      userAgent: 'Mozilla/5.0 Test',
      ip: '203.0.113.5',
    })
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })
    expect(extractClickMeta(headers).ip).toBe('198.51.100.7')
  })

  it('returns nulls when headers are missing', () => {
    expect(extractClickMeta(new Headers())).toEqual({ referrer: null, userAgent: null, ip: null })
  })
})
