import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import jwt from 'jsonwebtoken'
import { getUser } from '../api/_lib/auth.js'

const secret = 'test-jwt-secret'

before(() => {
  process.env.JWT_SECRET = secret
})

test('returns the payload for a valid HS256 token', () => {
  const token = jwt.sign({ userId: 7, email: 'a@example.com' }, secret, { expiresIn: '1h' })
  const user = getUser(`Bearer ${token}`)
  assert.equal(user.userId, 7)
  assert.equal(user.email, 'a@example.com')
})

test('rejects missing, malformed, expired and wrong-secret tokens', () => {
  assert.equal(getUser(undefined), null)
  assert.equal(getUser('Basic abc'), null)
  assert.equal(getUser('Bearer not-a-token'), null)
  assert.equal(getUser(`Bearer ${jwt.sign({ userId: 7 }, secret, { expiresIn: -1 })}`), null)
  assert.equal(getUser(`Bearer ${jwt.sign({ userId: 7 }, 'other-secret')}`), null)
})

test('rejects tokens signed with another algorithm', () => {
  assert.equal(getUser(`Bearer ${jwt.sign({ userId: 7 }, secret, { algorithm: 'HS512' })}`), null)
  assert.equal(getUser(`Bearer ${jwt.sign({ userId: 7 }, '', { algorithm: 'none' })}`), null)
})
