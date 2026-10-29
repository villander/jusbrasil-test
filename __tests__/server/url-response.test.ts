import { afterEach, describe, expect, it, vi } from 'vitest'
import { originFromHeaders, publicOrigin } from '@/lib/url-response'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('publicOrigin', () => {
  it('uses the request origin', () => {
    expect(publicOrigin('http://localhost:3000/api/shorten')).toBe('http://localhost:3000')
  })

  it('prefers an absolute BASE_URL without trailing slash', () => {
    vi.stubEnv('BASE_URL', 'https://sho.rt/')
    expect(publicOrigin('http://localhost:3000/api/shorten')).toBe('https://sho.rt')
  })
})

describe('originFromHeaders', () => {
  it('builds the origin from host and x-forwarded-proto', () => {
    const headers = new Headers({ host: 'sho.rt', 'x-forwarded-proto': 'https' })
    expect(originFromHeaders(headers)).toBe('https://sho.rt')
  })

  it('defaults to http when x-forwarded-proto is missing', () => {
    expect(originFromHeaders(new Headers({ host: 'localhost:3000' }))).toBe('http://localhost:3000')
  })

  it('prefers an absolute BASE_URL', () => {
    vi.stubEnv('BASE_URL', 'https://sho.rt')
    expect(originFromHeaders(new Headers({ host: 'localhost:3000' }))).toBe('https://sho.rt')
  })
})
