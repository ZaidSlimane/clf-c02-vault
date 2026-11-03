import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { bearer, fakeAiSettingsSql, mockRes, setTestEnv } from './helpers.mjs'

setTestEnv()
const { default: handler, createHandler } = await import('../api/chat.js')
const { ProviderError } = await import('../api/_lib/aiProvider.js')
const { KeyConfigError } = await import('../api/_lib/crypto.js')

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const row = { base_url: 'https://provider.example.com/v1', model: 'saved-model', api_key_encrypted: 'cipher' }

function setup(overrides = {}) {
  const db = fakeAiSettingsSql(new Map([[1, row]]))
  const providerCalls = []
  const handle = createHandler({
    sql: db.sql,
    decryptApiKey: () => 'sk-saved',
    callProvider: async (input) => { providerCalls.push(input); return 'the answer' },
    ...overrides,
  })
  return { handle, db, providerCalls }
}

const post = (body, userId = 1) => ({ method: 'POST', headers: { authorization: bearer(userId) }, body })

async function run(handle, req) {
  const res = mockRes()
  await handle(req, res)
  return res
}

test('the real handler returns 401 without a token before any DB or network work', async () => {
  let outbound = 0
  globalThis.fetch = async () => { outbound++; throw new Error('no network in tests') }
  for (const authorization of [undefined, 'Bearer invalid']) {
    const res = await run(handler, { method: 'POST', headers: { authorization }, body: { prompt: 'hi' } })
    assert.equal(res.statusCode, 401)
  }
  assert.equal(outbound, 0)
})

test('an unauthenticated request issues no query', async () => {
  const { handle, db } = setup()
  const res = await run(handle, { method: 'POST', headers: {}, body: { prompt: 'hi' } })
  assert.equal(res.statusCode, 401)
  assert.equal(db.calls.length, 0)
})

test('only POST is accepted', async () => {
  const { handle } = setup()
  for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
    assert.equal((await run(handle, { method, headers: {} })).statusCode, 405)
  }
})

test('validates the prompt', async () => {
  const { handle, db } = setup()
  for (const prompt of [undefined, '', 5, 'x'.repeat(20001)]) {
    assert.equal((await run(handle, post({ prompt }))).statusCode, 400)
  }
  assert.equal(db.calls.length, 0)
  assert.equal((await run(handle, post({ prompt: 'x'.repeat(20000) }))).statusCode, 200)
})

test('a user with no settings gets 409 AI_NOT_CONFIGURED', async () => {
  const { handle, providerCalls } = setup()
  const res = await run(handle, post({ prompt: 'hi' }, 2))
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'AI_NOT_CONFIGURED')
  assert.equal(providerCalls.length, 0)
})

test('uses saved settings and ignores body-supplied provider fields', async () => {
  const { handle, providerCalls } = setup()
  const res = await run(handle, post({
    prompt: 'hi', baseUrl: 'https://evil.example.com', model: 'evil', apiKey: 'evil',
  }))
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { answer: 'the answer' })
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assert.deepEqual(providerCalls, [{
    baseUrl: row.base_url, model: row.model, apiKey: 'sk-saved', prompt: 'hi',
  }])
})

test('an undecryptable key returns 409 AI_KEY_UNREADABLE', async () => {
  const { handle } = setup({ decryptApiKey: () => { throw new Error('bad tag') } })
  const res = await run(handle, post({ prompt: 'hi' }))
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'AI_KEY_UNREADABLE')
})

test('a missing encryption secret returns a generic 500', async () => {
  const { handle } = setup({ decryptApiKey: () => { throw new KeyConfigError() } })
  const res = await run(handle, post({ prompt: 'hi' }))
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'AI request failed' })
})

for (const [code, status] of [
  ['AI_PROVIDER_AUTH', 502],
  ['AI_PROVIDER_RATE_LIMIT', 429],
  ['AI_PROVIDER_ERROR', 502],
]) {
  test(`maps ${code} to ${status}, never 401`, async () => {
    const { handle } = setup({ callProvider: async () => { throw new ProviderError(code) } })
    const res = await run(handle, post({ prompt: 'hi' }))
    assert.equal(res.statusCode, status)
    assert.equal(res.body.code, code)
  })
}
