import assert from 'node:assert/strict'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fakeUsersSql, JWT_SECRET, mockRes, setTestEnv } from './helpers.mjs'

setTestEnv()
const { createHandler: createLogin } = await import('../api/auth/login.js')
const { createHandler: createRegister } = await import('../api/auth/register.js')

const EMAIL = 'a@example.com'
const USERNAME = 'alice_a'
const PASSWORD = 'correct-horse'
const STRONG = 'Correct-Horse-9'
const SIGN_UP = { firstName: 'Alice', lastName: 'Ng', username: USERNAME, email: EMAIL, password: STRONG }

const send = async (handle, req) => {
  const res = mockRes()
  await handle({ method: 'POST', ...req }, res)
  return res
}

const failingSql = async () => { throw new Error('db down') }

async function existingUser() {
  const users = fakeUsersSql([
    { id: 7, email: EMAIL, username: USERNAME, first_name: 'Alice', last_name: 'Ng', password_hash: await bcrypt.hash(PASSWORD, 4) },
  ])
  return createLogin({ sql: users.sql })
}

test('login rejects other methods', async () => {
  const res = await send(createLogin({ sql: fakeUsersSql().sql }), { method: 'GET' })
  assert.equal(res.statusCode, 405)
})

test('login requires an identifier and password', async () => {
  const handle = createLogin({ sql: fakeUsersSql().sql })
  assert.equal((await send(handle, { body: { identifier: EMAIL } })).statusCode, 400)
  assert.equal((await send(handle, { body: { password: PASSWORD } })).statusCode, 400)
  assert.equal((await send(handle, {})).statusCode, 400)
})

test('login gives the same 401 for an unknown email and a wrong password', async () => {
  const handle = await existingUser()
  const unknown = await send(handle, { body: { identifier: 'b@example.com', password: PASSWORD } })
  const wrong = await send(handle, { body: { identifier: EMAIL, password: 'not-the-password' } })
  assert.equal(unknown.statusCode, 401)
  assert.equal(wrong.statusCode, 401)
  assert.deepEqual(unknown.body, wrong.body)
})

test('login returns a token for that user and no password hash', async () => {
  const res = await send(await existingUser(), { body: { identifier: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.user, { id: 7, email: EMAIL, username: USERNAME, firstName: 'Alice', lastName: 'Ng' })
  assert.equal(JSON.stringify(res.body).includes('password_hash'), false)
  const claims = jwt.verify(res.body.token, JWT_SECRET)
  assert.equal(claims.userId, 7)
  assert.equal(claims.email, EMAIL)
})

test('login answers 500 when the query fails', async () => {
  const res = await send(createLogin({ sql: failingSql }), { body: { identifier: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 500)
})

test('login accepts the username in any case', async () => {
  const res = await send(await existingUser(), { body: { identifier: 'ALICE_A', password: PASSWORD } })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.user.id, 7)
})

test('login still works for an account with no username', async () => {
  const users = fakeUsersSql([{ id: 3, email: EMAIL, username: null, password_hash: await bcrypt.hash(PASSWORD, 4) }])
  const res = await send(createLogin({ sql: users.sql }), { body: { identifier: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.user.username, null)
})

test('login does not reveal the database error', async () => {
  const res = await send(createLogin({ sql: failingSql }), { body: { identifier: EMAIL, password: PASSWORD } })
  assert.equal(res.body.error, 'Login failed')
})

test('register rejects other methods', async () => {
  const res = await send(createRegister({ sql: fakeUsersSql().sql }), { method: 'GET' })
  assert.equal(res.statusCode, 405)
})

test('register requires every field as a string', async () => {
  const handle = createRegister({ sql: fakeUsersSql().sql })
  for (const field of Object.keys(SIGN_UP)) {
    assert.equal((await send(handle, { body: { ...SIGN_UP, [field]: '' } })).statusCode, 400)
    assert.equal((await send(handle, { body: { ...SIGN_UP, [field]: { a: 1 } } })).statusCode, 400)
  }
})

test('register rejects weak passwords and creates nothing', async () => {
  const users = fakeUsersSql()
  const handle = createRegister({ sql: users.sql })
  const weak = ['Short-1a', 'alllowercase-99', 'ALLUPPERCASE-99', 'NoDigitsHere-x', 'NoSymbols12345', `Xx-1${USERNAME}999`, `Aa-1${'x'.repeat(70)}`]
  for (const password of weak) {
    assert.equal((await send(handle, { body: { ...SIGN_UP, password } })).statusCode, 400, password)
  }
  assert.equal(users.rows.length, 0)
})

test('register rejects bad usernames and emails', async () => {
  const handle = createRegister({ sql: fakeUsersSql().sql })
  for (const username of ['ab', 'has space', 'a@b.co', 'x'.repeat(31)]) {
    assert.equal((await send(handle, { body: { ...SIGN_UP, username } })).statusCode, 400, username)
  }
  assert.equal((await send(handle, { body: { ...SIGN_UP, email: 'not-an-email' } })).statusCode, 400)
})

test('register rejects a duplicate email in any case', async () => {
  const users = fakeUsersSql()
  const handle = createRegister({ sql: users.sql })
  await send(handle, { body: SIGN_UP })
  const res = await send(handle, { body: { ...SIGN_UP, username: 'other', email: 'A@Example.com' } })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.error, 'Email already registered')
  assert.equal(users.rows.length, 1)
})

test('register rejects a duplicate username in any case', async () => {
  const users = fakeUsersSql()
  const handle = createRegister({ sql: users.sql })
  await send(handle, { body: SIGN_UP })
  const res = await send(handle, { body: { ...SIGN_UP, username: 'ALICE_A', email: 'b@example.com' } })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.error, 'Username already taken')
  assert.equal(users.rows.length, 1)
})

test('register answers 409 when a concurrent sign up wins the race', async () => {
  const raced = async (strings) => {
    if (strings.join('?').includes('SELECT')) return []
    throw Object.assign(new Error('duplicate'), { code: '23505', constraint: 'users_username_lower_idx' })
  }
  const res = await send(createRegister({ sql: raced }), { body: SIGN_UP })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.error, 'Username already taken')
})

test('register returns the profile and a token, and stores a bcrypt hash', async () => {
  const users = fakeUsersSql()
  const res = await send(createRegister({ sql: users.sql }), { body: { ...SIGN_UP, firstName: ' Alice ' } })
  assert.equal(res.statusCode, 201)
  assert.deepEqual(res.body.user, { id: 1, email: EMAIL, username: USERNAME, firstName: 'Alice', lastName: 'Ng' })
  assert.equal(jwt.verify(res.body.token, JWT_SECRET).userId, 1)
  const stored = users.rows[0].password_hash
  assert.notEqual(stored, STRONG)
  assert.equal(await bcrypt.compare(STRONG, stored), true)
})

test('two registrations get different ids and tokens for their own user', async () => {
  const handle = createRegister({ sql: fakeUsersSql().sql })
  const first = await send(handle, { body: SIGN_UP })
  const second = await send(handle, { body: { ...SIGN_UP, username: 'bob_b', email: 'b@example.com' } })
  assert.notEqual(first.body.user.id, second.body.user.id)
  assert.notEqual(first.body.token, second.body.token)
  assert.equal(jwt.verify(first.body.token, JWT_SECRET).userId, first.body.user.id)
  assert.equal(jwt.verify(second.body.token, JWT_SECRET).userId, second.body.user.id)
  assert.equal(jwt.verify(second.body.token, JWT_SECRET).email, 'b@example.com')
})

test('register does not reveal the database error', async () => {
  const res = await send(createRegister({ sql: failingSql }), { body: SIGN_UP })
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.error, 'Registration failed')
})
