import assert from 'node:assert/strict'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fakeUsersSql, JWT_SECRET, mockRes, setTestEnv } from './helpers.mjs'

setTestEnv()
const { createHandler: createLogin } = await import('../api/auth/login.js')
const { createHandler: createRegister } = await import('../api/auth/register.js')

const EMAIL = 'a@example.com'
const PASSWORD = 'correct-horse'

const send = async (handle, req) => {
  const res = mockRes()
  await handle({ method: 'POST', ...req }, res)
  return res
}

const failingSql = async () => { throw new Error('db down') }

async function existingUser() {
  const users = fakeUsersSql([
    { id: 7, email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 4) },
  ])
  return createLogin({ sql: users.sql })
}

test('login rejects other methods', async () => {
  const res = await send(createLogin({ sql: fakeUsersSql().sql }), { method: 'GET' })
  assert.equal(res.statusCode, 405)
})

test('login requires email and password', async () => {
  const handle = createLogin({ sql: fakeUsersSql().sql })
  assert.equal((await send(handle, { body: { email: EMAIL } })).statusCode, 400)
  assert.equal((await send(handle, { body: { password: PASSWORD } })).statusCode, 400)
  assert.equal((await send(handle, {})).statusCode, 400)
})

test('login gives the same 401 for an unknown email and a wrong password', async () => {
  const handle = await existingUser()
  const unknown = await send(handle, { body: { email: 'b@example.com', password: PASSWORD } })
  const wrong = await send(handle, { body: { email: EMAIL, password: 'not-the-password' } })
  assert.equal(unknown.statusCode, 401)
  assert.equal(wrong.statusCode, 401)
  assert.deepEqual(unknown.body, wrong.body)
})

test('login returns a token for that user and no password hash', async () => {
  const res = await send(await existingUser(), { body: { email: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.user, { id: 7, email: EMAIL })
  assert.equal(JSON.stringify(res.body).includes('password_hash'), false)
  const claims = jwt.verify(res.body.token, JWT_SECRET)
  assert.equal(claims.userId, 7)
  assert.equal(claims.email, EMAIL)
})

test('login answers 500 when the query fails', async () => {
  const res = await send(createLogin({ sql: failingSql }), { body: { email: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 500)
})

test('register rejects other methods', async () => {
  const res = await send(createRegister({ sql: fakeUsersSql().sql }), { method: 'GET' })
  assert.equal(res.statusCode, 405)
})

test('register requires email and password', async () => {
  const handle = createRegister({ sql: fakeUsersSql().sql })
  assert.equal((await send(handle, { body: { email: EMAIL } })).statusCode, 400)
  assert.equal((await send(handle, { body: { password: PASSWORD } })).statusCode, 400)
})

test('register rejects a short password and creates nothing', async () => {
  const users = fakeUsersSql()
  const res = await send(createRegister({ sql: users.sql }), { body: { email: EMAIL, password: '12345' } })
  assert.equal(res.statusCode, 400)
  assert.equal(users.rows.length, 0)
})

test('register rejects a duplicate email', async () => {
  const users = fakeUsersSql()
  const handle = createRegister({ sql: users.sql })
  await send(handle, { body: { email: EMAIL, password: PASSWORD } })
  const res = await send(handle, { body: { email: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 409)
  assert.equal(users.rows.length, 1)
})

test('register returns a token for the new id and stores a bcrypt hash', async () => {
  const users = fakeUsersSql()
  const res = await send(createRegister({ sql: users.sql }), { body: { email: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 201)
  assert.deepEqual(res.body.user, { id: 1, email: EMAIL })
  assert.equal(jwt.verify(res.body.token, JWT_SECRET).userId, 1)
  const stored = users.rows[0].password_hash
  assert.notEqual(stored, PASSWORD)
  assert.equal(await bcrypt.compare(PASSWORD, stored), true)
})

test('two registrations get different ids and tokens for their own user', async () => {
  const handle = createRegister({ sql: fakeUsersSql().sql })
  const first = await send(handle, { body: { email: EMAIL, password: PASSWORD } })
  const second = await send(handle, { body: { email: 'b@example.com', password: PASSWORD } })
  assert.notEqual(first.body.user.id, second.body.user.id)
  assert.notEqual(first.body.token, second.body.token)
  assert.equal(jwt.verify(first.body.token, JWT_SECRET).userId, first.body.user.id)
  assert.equal(jwt.verify(second.body.token, JWT_SECRET).userId, second.body.user.id)
  assert.equal(jwt.verify(second.body.token, JWT_SECRET).email, 'b@example.com')
})

test('register answers 500 when the query fails', async () => {
  const res = await send(createRegister({ sql: failingSql }), { body: { email: EMAIL, password: PASSWORD } })
  assert.equal(res.statusCode, 500)
})
