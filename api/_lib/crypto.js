import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const VERSION = 'v1'
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

export class KeyConfigError extends Error {
  constructor() {
    super('AI_KEY_ENCRYPTION_SECRET is missing or invalid')
    this.name = 'KeyConfigError'
  }
}

function getSecret() {
  const value = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!value || !BASE64.test(value)) throw new KeyConfigError()
  const key = Buffer.from(value, 'base64')
  if (key.length !== KEY_BYTES) throw new KeyConfigError()
  return key
}

const aad = (userId) => Buffer.from(String(userId), 'utf8')

export function encryptApiKey(plaintext, userId) {
  const key = getSecret()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES })
  cipher.setAAD(aad(userId))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decryptApiKey(stored, userId) {
  const key = getSecret()
  const parts = String(stored).split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('Unsupported ciphertext format')

  const iv = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  const ciphertext = Buffer.from(parts[3], 'base64')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error('Unsupported ciphertext format')

  const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES })
  decipher.setAAD(aad(userId))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
