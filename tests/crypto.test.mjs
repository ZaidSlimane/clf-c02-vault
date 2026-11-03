import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { beforeEach, test } from 'node:test'
import { decryptApiKey, encryptApiKey, KeyConfigError } from '../api/_lib/crypto.js'

const secret = () => randomBytes(32).toString('base64')
const plaintext = 'sk-super-secret-value'

beforeEach(() => {
  process.env.AI_KEY_ENCRYPTION_SECRET = secret()
})

// Flips one decoded byte of a v1.<iv>.<tag>.<ciphertext> part.
function tamper(stored, partIndex) {
  const parts = stored.split('.')
  const bytes = Buffer.from(parts[partIndex], 'base64')
  bytes[0] ^= 0xff
  parts[partIndex] = bytes.toString('base64')
  return parts.join('.')
}

test('round trips and uses the v1 format', () => {
  const stored = encryptApiKey(plaintext, 1)
  assert.match(stored, /^v1\.[^.]+\.[^.]+\.[^.]+$/)
  assert.ok(!stored.includes(plaintext))
  assert.equal(decryptApiKey(stored, 1), plaintext)
})

test('produces different ciphertext for the same input', () => {
  assert.notEqual(encryptApiKey(plaintext, 1), encryptApiKey(plaintext, 1))
})

for (const [name, index] of [['IV', 1], ['tag', 2], ['ciphertext', 3]]) {
  test(`fails on a tampered ${name}`, () => {
    assert.throws(() => decryptApiKey(tamper(encryptApiKey(plaintext, 1), index), 1))
  })
}

test('fails on an unknown format', () => {
  assert.throws(() => decryptApiKey('v2.a.b.c', 1))
  assert.throws(() => decryptApiKey(plaintext, 1))
})

test('fails under another user ID', () => {
  assert.throws(() => decryptApiKey(encryptApiKey(plaintext, 1), 2))
})

test('fails under another secret', () => {
  const stored = encryptApiKey(plaintext, 1)
  process.env.AI_KEY_ENCRYPTION_SECRET = secret()
  assert.throws(() => decryptApiKey(stored, 1))
})

test('fails closed on missing or invalid secrets', () => {
  const stored = encryptApiKey(plaintext, 1)
  const invalid = [undefined, '', Buffer.alloc(16).toString('base64'), Buffer.alloc(33).toString('base64'), 'not base64!']
  for (const value of invalid) {
    if (value === undefined) delete process.env.AI_KEY_ENCRYPTION_SECRET
    else process.env.AI_KEY_ENCRYPTION_SECRET = value
    assert.throws(() => encryptApiKey(plaintext, 1), KeyConfigError)
    assert.throws(() => decryptApiKey(stored, 1), KeyConfigError)
  }
})
