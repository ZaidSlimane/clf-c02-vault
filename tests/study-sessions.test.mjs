import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bearer, mockRes, setTestEnv } from './helpers.mjs'

setTestEnv()
const { createHandler, isValidSession } = await import('../api/study-sessions.js')

const NOW = Date.now()

function setup(result = []) {
  const calls = []
  const sql = async (strings, ...values) => {
    calls.push({ text: strings.join('?'), values })
    return result
  }
  return { calls, handle: createHandler({ sql }) }
}

const send = async (handle, req) => {
  const res = mockRes()
  await handle({ headers: { authorization: bearer(7) }, ...req }, res)
  return res
}

test('rejects requests without a valid token', async () => {
  const { calls, handle } = setup()
  const res = mockRes()
  await handle({ method: 'GET', headers: {} }, res)
  assert.equal(res.statusCode, 401)
  assert.equal(calls.length, 0)
})

test('returns the sessions of the signed-in user as timestamps', async () => {
  const startedAt = new Date(NOW - 60000)
  const { calls, handle } = setup([{ started_at: startedAt, minutes: 25 }])
  const res = await send(handle, { method: 'GET' })
  assert.deepEqual(res.body, [{ startedAt: startedAt.getTime(), minutes: 25 }])
  assert.equal(calls[0].values[0], 7)
})

test('saves a valid session once per start time', async () => {
  const { calls, handle } = setup()
  const res = await send(handle, { method: 'POST', body: { startedAt: NOW - 60000, minutes: 25 } })
  assert.equal(res.statusCode, 200)
  assert.equal(calls[0].values[0], 7)
  assert.match(calls[0].text, /ON CONFLICT \(user_id, started_at\) DO NOTHING/)
})

test('rejects invalid sessions before touching the database', async () => {
  const { calls, handle } = setup()
  const res = await send(handle, { method: 'POST', body: { startedAt: NOW, minutes: 241 } })
  assert.equal(res.statusCode, 400)
  assert.equal(calls.length, 0)
})

test('validates minutes and start time bounds', () => {
  assert.equal(isValidSession({ startedAt: NOW, minutes: 240 }, NOW), true)
  assert.equal(isValidSession({ startedAt: NOW, minutes: 0 }, NOW), false)
  assert.equal(isValidSession({ startedAt: NOW, minutes: 1.5 }, NOW), false)
  assert.equal(isValidSession({ startedAt: NOW + 3600000, minutes: 5 }, NOW), false)
  assert.equal(isValidSession({ startedAt: NOW - 400 * 86400000, minutes: 5 }, NOW), false)
  assert.equal(isValidSession({ startedAt: '2026-01-01', minutes: 5 }, NOW), false)
  assert.equal(isValidSession(undefined, NOW), false)
})

test('hides database errors', async () => {
  const handle = createHandler({ sql: async () => { throw new Error('secret detail') } })
  const res = await send(handle, { method: 'GET' })
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'Failed to fetch study sessions' })
})
