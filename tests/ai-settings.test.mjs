import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { bearer, fakeAiSettingsSql, mockRes, setTestEnv } from './helpers.mjs'

setTestEnv()
const { default: handler, createHandler } = await import('../api/ai-settings.js')
const { BaseUrlError } = await import('../api/_lib/ssrf.js')
const { KeyConfigError } = await import('../api/_lib/crypto.js')

const SECRET_KEY = 'sk-very-secret'
const CIPHERTEXT = 'v1.iv.tag.ciphertext'
const row = { base_url: 'https://provider.example.com/v1', model: 'old', api_key_encrypted: CIPHERTEXT }

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

function setup(overrides = {}, rows = new Map([[1, { ...row }]])) {
  const db = fakeAiSettingsSql(rows)
  const handle = createHandler({
    sql: db.sql,
    encryptApiKey: (key, userId) => `v1.encrypted.${userId}.${key.length}`,
    assertPublicHost: async () => {},
    ...overrides,
  })
  return { handle, db }
}

async function run(handle, method, body, userId = 1) {
  const res = mockRes()
  await handle({ method, headers: { authorization: bearer(userId) }, body }, res)
  return res
}

const assertNoSecrets = (res) => {
  const text = JSON.stringify(res.body ?? '')
  assert.ok(!text.includes(SECRET_KEY))
  assert.ok(!text.includes('ciphertext'))
  assert.ok(!text.includes('v1.'))
}

test('the real handler returns 401 for every method without a token, with no network', async () => {
  let outbound = 0
  globalThis.fetch = async () => { outbound++; throw new Error('no network in tests') }
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const res = mockRes()
    await handler({ method, headers: {} }, res)
    assert.equal(res.statusCode, 401)
  }
  assert.equal(outbound, 0)
})

test('GET returns the public shape and never key material', async () => {
  const { handle } = setup()
  const res = await run(handle, 'GET')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { configured: true, baseUrl: row.base_url, model: 'old' })
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assertNoSecrets(res)
})

test('GET returns nulls when no row exists', async () => {
  const { handle } = setup()
  const res = await run(handle, 'GET', undefined, 2)
  assert.deepEqual(res.body, { configured: false, baseUrl: null, model: null })
})

test('PUT creates a row, stores ciphertext and normalises the URL', async () => {
  const { handle, db } = setup({}, new Map())
  const res = await run(handle, 'PUT', { baseUrl: 'https://new.example.com/v1/', model: ' m ', apiKey: SECRET_KEY })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { configured: true, baseUrl: 'https://new.example.com/v1', model: 'm' })
  assertNoSecrets(res)
  const stored = db.rows.get(1)
  assert.ok(stored.api_key_encrypted.startsWith('v1.'))
  assert.ok(!JSON.stringify(stored).includes(SECRET_KEY))
})

test('PUT requires a key when no row exists', async () => {
  const { handle, db } = setup({}, new Map())
  const res = await run(handle, 'PUT', { baseUrl: row.base_url, model: 'm' })
  assert.equal(res.statusCode, 400)
  assert.equal(db.rows.size, 0)
})

test('a model-only change keeps the key', async () => {
  const { handle, db } = setup()
  const res = await run(handle, 'PUT', { baseUrl: row.base_url, model: 'new' })
  assert.equal(res.statusCode, 200)
  assert.equal(db.rows.get(1).model, 'new')
  assert.equal(db.rows.get(1).api_key_encrypted, CIPHERTEXT)
})

test('a path change on the same origin keeps the key', async () => {
  const { handle, db } = setup()
  const res = await run(handle, 'PUT', { baseUrl: 'https://provider.example.com/v2', model: 'old' })
  assert.equal(res.statusCode, 200)
  assert.equal(db.rows.get(1).base_url, 'https://provider.example.com/v2')
  assert.equal(db.rows.get(1).api_key_encrypted, CIPHERTEXT)
})

test('changing origin without a key returns 400 and leaves the row unchanged', async () => {
  const { handle, db } = setup()
  const res = await run(handle, 'PUT', { baseUrl: 'https://other.example.com/v1', model: 'new' })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(db.rows.get(1), row)
})

test('changing origin with a new key succeeds', async () => {
  const { handle, db } = setup()
  const res = await run(handle, 'PUT', { baseUrl: 'https://other.example.com/v1', model: 'new', apiKey: SECRET_KEY })
  assert.equal(res.statusCode, 200)
  assert.notEqual(db.rows.get(1).api_key_encrypted, CIPHERTEXT)
})

test('PUT validates model and key', async () => {
  const { handle, db } = setup()
  for (const body of [
    { baseUrl: row.base_url, model: '' },
    { baseUrl: row.base_url, model: 5 },
    { baseUrl: row.base_url, model: 'x'.repeat(201) },
    { baseUrl: row.base_url, model: 'a\nb' },
    { baseUrl: row.base_url, model: 'm', apiKey: 'x'.repeat(4097) },
    { baseUrl: row.base_url, model: 'm', apiKey: 'a\r\nb' },
    { baseUrl: row.base_url, model: 'm', apiKey: 'sk-\u201cquoted\u201d' },
    { baseUrl: row.base_url, model: 'm', apiKey: 'sk-caf\u00e9' },
    { baseUrl: row.base_url, model: 'm', apiKey: 'sk with space' },
    { baseUrl: row.base_url, model: 'm', apiKey: 5 },
    undefined,
  ]) {
    assert.equal((await run(handle, 'PUT', body)).statusCode, 400)
  }
  assert.deepEqual(db.rows.get(1), row)
})

test('a key-less save fails if the base URL changed after the origin check', async () => {
  const db = fakeAiSettingsSql(new Map([[1, { ...row }]]))
  const racingSql = async (strings, ...values) => {
    const result = await db.sql(strings, ...values)
    if (strings.join('?').includes('SELECT')) {
      db.rows.set(1, { ...row, base_url: 'https://attacker.example.com/v1' })
    }
    return result
  }
  const handle = createHandler({
    sql: racingSql,
    encryptApiKey: () => { throw new Error('must not encrypt') },
    assertPublicHost: async () => {},
  })
  const res = await run(handle, 'PUT', { baseUrl: row.base_url, model: 'new' })
  assert.equal(res.statusCode, 409)
  assert.equal(db.rows.get(1).base_url, 'https://attacker.example.com/v1')
  assert.equal(db.rows.get(1).model, 'old')
})

test('a key-less save fails if the row was removed after the check', async () => {
  const db = fakeAiSettingsSql(new Map([[1, { ...row }]]))
  const racingSql = async (strings, ...values) => {
    const result = await db.sql(strings, ...values)
    if (strings.join('?').includes('SELECT')) db.rows.delete(1)
    return result
  }
  const handle = createHandler({ sql: racingSql, encryptApiKey: () => '', assertPublicHost: async () => {} })
  const res = await run(handle, 'PUT', { baseUrl: row.base_url, model: 'new' })
  assert.equal(res.statusCode, 409)
  assert.equal(db.rows.has(1), false)
})

test('a blocked host is rejected on save with the generic message', async () => {
  const { handle, db } = setup({ assertPublicHost: async () => { throw new BaseUrlError() } })
  const res = await run(handle, 'PUT', { baseUrl: 'https://rebind.example.com', model: 'm', apiKey: SECRET_KEY })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'This base URL is not allowed' })
  assert.deepEqual(db.rows.get(1), row)
})

test('format rules apply on save', async () => {
  const { handle } = setup()
  const res = await run(handle, 'PUT', { baseUrl: 'https://169.254.169.254', model: 'm', apiKey: SECRET_KEY })
  assert.equal(res.statusCode, 400)
})

test('a missing encryption secret stores nothing and returns a generic 500', async () => {
  const { handle, db } = setup({ encryptApiKey: () => { throw new KeyConfigError() } })
  const res = await run(handle, 'PUT', { baseUrl: row.base_url, model: 'new', apiKey: SECRET_KEY })
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'Failed to process AI settings' })
  assert.deepEqual(db.rows.get(1), row)
})

test('users cannot reach each other\'s rows', async () => {
  const rows = new Map([[1, { ...row }], [2, { ...row, model: 'b' }]])
  const { handle, db } = setup({}, rows)
  await run(handle, 'PUT', { baseUrl: row.base_url, model: 'changed' }, 2)
  await run(handle, 'DELETE', undefined, 2)
  assert.deepEqual(db.rows.get(1), row)
  assert.equal(db.rows.has(2), false)
  assert.ok(db.calls.every(({ values }) => !values.includes(1)))
})

test('DELETE returns 204 and other methods 405', async () => {
  const { handle, db } = setup()
  assert.equal((await run(handle, 'DELETE')).statusCode, 204)
  assert.equal(db.rows.has(1), false)
  assert.equal((await run(handle, 'POST', {})).statusCode, 405)
})
