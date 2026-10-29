import { describe, expect, it } from 'vitest'
import { validateUrl } from '@/lib/validate-url'

describe('validateUrl', () => {
  it.each(['http://example.com', 'https://example.com', 'https://sub.example.com/path?q=1#hash', 'HTTPS://EXAMPLE.COM'])(
    'accepts %s',
    (input) => {
      expect(validateUrl(input)).toEqual({ ok: true, url: new URL(input).href })
    },
  )

  it('trims surrounding whitespace', () => {
    expect(validateUrl('  https://example.com/a  ')).toEqual({ ok: true, url: 'https://example.com/a' })
  })

  it.each([
    ['empty string', ''],
    ['only whitespace', '   '],
    ['no protocol', 'example.com'],
    ['ftp protocol', 'ftp://example.com/file'],
    ['javascript protocol', 'javascript:alert(1)'],
    ['mailto protocol', 'mailto:someone@example.com'],
    ['data protocol', 'data:text/html,<h1>x</h1>'],
    ['missing host', 'http://'],
    ['garbage', 'not a url'],
  ])('rejects %s', (_label, input) => {
    const result = validateUrl(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toEqual(expect.any(String))
  })
})
