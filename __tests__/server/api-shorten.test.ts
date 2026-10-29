import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetDatabase } from '../helpers/db'
import { POST } from '@/app/api/shorten/route'

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/shorten', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/shorten', () => {
  it('creates a short url and returns 201 with the expected payload', async () => {
    const res = await post({ url: 'https://example.com/some/path?q=1' })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({
      shortCode: expect.stringMatching(/^[A-Za-z0-9]{7}$/),
      shortUrl: `http://localhost/${body.shortCode}`,
      originalUrl: 'https://example.com/some/path?q=1',
      createdAt: expect.any(String),
      expiresAt: null,
    })
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt)
    expect(await prisma.shortUrl.count()).toBe(1)
  })

  it('accepts an optional future expiresAt', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const res = await post({ url: 'https://example.com/', expiresAt })

    expect(res.status).toBe(201)
    expect((await res.json()).expiresAt).toBe(expiresAt)
  })

  it('uses BASE_URL for shortUrl when configured', async () => {
    vi.stubEnv('BASE_URL', 'https://sho.rt')
    const body = await (await post({ url: 'https://example.com/' })).json()
    expect(body.shortUrl).toBe(`https://sho.rt/${body.shortCode}`)
  })

  it.each([
    ['missing url', {}],
    ['non-string url', { url: 123 }],
    ['ftp url', { url: 'ftp://example.com/file' }],
    ['javascript url', { url: 'javascript:alert(1)' }],
    ['url without protocol', { url: 'example.com' }],
    ['past expiresAt', { url: 'https://example.com/', expiresAt: '2000-01-01T00:00:00.000Z' }],
    ['invalid expiresAt', { url: 'https://example.com/', expiresAt: 'soon' }],
  ])('returns 400 for %s', async (_label, payload) => {
    const res = await post(payload)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: expect.any(String) })
    expect(await prisma.shortUrl.count()).toBe(0)
  })

  it('returns 400 for a malformed JSON body', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
  })
})
