export type ValidateUrlResult = { ok: true; url: string } | { ok: false; error: string }

export const EMPTY_URL_MESSAGE = 'Informe uma URL.'
export const INVALID_URL_MESSAGE = 'URL inválida. Use um endereço começando com http:// ou https://.'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function validateUrl(input: string): ValidateUrlResult {
  const value = input.trim()
  if (!value) return { ok: false, error: EMPTY_URL_MESSAGE }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, error: INVALID_URL_MESSAGE }
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    return { ok: false, error: INVALID_URL_MESSAGE }
  }

  return { ok: true, url: parsed.href }
}
