import { randomInt } from 'node:crypto'

export const SHORT_CODE_LENGTH = 7

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  let code = ''
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code
}
