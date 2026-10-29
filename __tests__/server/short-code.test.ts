import { describe, expect, it } from 'vitest'
import { generateShortCode, SHORT_CODE_LENGTH } from '@/lib/short-code'

describe('generateShortCode', () => {
  it('generates 7 alphanumeric characters by default', () => {
    expect(SHORT_CODE_LENGTH).toBe(7)
    expect(generateShortCode()).toMatch(/^[A-Za-z0-9]{7}$/)
  })

  it('respects a custom length', () => {
    expect(generateShortCode(10)).toMatch(/^[A-Za-z0-9]{10}$/)
  })

  it('produces distinct codes across many calls', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShortCode()))
    expect(codes.size).toBe(1000)
  })
})
