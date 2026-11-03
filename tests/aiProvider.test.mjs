import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import { callProvider, ProviderError } from '../api/_lib/aiProvider.js'
import { createValidatingLookup } from '../api/_lib/ssrf.js'

const UPSTREAM_SECRET = 'upstream-secret-text'
const input = { baseUrl: 'https://provider.example.com/v1', model: 'm', apiKey: 'sk-test', prompt: 'hello' }

let server
let port
let handle
let hits

before(async () => {
  server = http.createServer((req, res) => {
    hits.push(req)
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      req.body = body
      handle(req, res)
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})

after(() => {
  server.closeAllConnections()
  server.close()
})

beforeEach(() => {
  hits = []
})

// Sends the real request options to a local plain HTTP server.
const options = (extra = {}) => ({
  lookup: () => {},
  request: (opts, callback) => http.request({ ...opts, lookup: undefined, hostname: '127.0.0.1', port }, callback),
  ...extra,
})

const json = (status, value, headers = {}) => (req, res) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify(value))
}

async function failure(promise) {
  const err = await promise.then(() => assert.fail('expected a failure'), (e) => e)
  assert.ok(err instanceof ProviderError)
  assert.ok(!err.message.includes(UPSTREAM_SECRET))
  return err.code
}

test('posts to chat/completions and returns the content', async () => {
  handle = json(200, { choices: [{ message: { content: 'answer' } }] })
  assert.equal(await callProvider(input, options()), 'answer')
  const [req] = hits
  assert.equal(req.method, 'POST')
  assert.equal(req.url, '/v1/chat/completions')
  assert.equal(req.headers.authorization, 'Bearer sk-test')
  assert.equal(req.headers.origin, undefined)
  assert.deepEqual(JSON.parse(req.body), { model: 'm', messages: [{ role: 'user', content: 'hello' }] })
})

test('passes a validating lookup and no shared agent to the request', async () => {
  handle = json(200, { choices: [{ message: { content: 'answer' } }] })
  const lookup = () => {}
  let seen
  await callProvider(input, options({
    lookup,
    request: (opts, callback) => {
      seen = opts
      return http.request({ ...opts, lookup: undefined, hostname: '127.0.0.1', port }, callback)
    },
  }))
  assert.equal(seen.lookup, lookup)
  assert.equal(seen.agent, false)
  assert.equal(seen.hostname, 'provider.example.com')
})

for (const [status, code] of [
  [401, 'AI_PROVIDER_AUTH'],
  [403, 'AI_PROVIDER_AUTH'],
  [429, 'AI_PROVIDER_RATE_LIMIT'],
  [400, 'AI_PROVIDER_ERROR'],
  [500, 'AI_PROVIDER_ERROR'],
]) {
  test(`maps ${status} to ${code} without upstream text`, async () => {
    handle = json(status, { error: { message: UPSTREAM_SECRET } })
    assert.equal(await failure(callProvider(input, options())), code)
  })
}

test('does not follow redirects', async () => {
  handle = json(302, { error: UPSTREAM_SECRET }, { Location: `http://127.0.0.1:${port}/next` })
  assert.equal(await failure(callProvider(input, options())), 'AI_PROVIDER_ERROR')
  assert.equal(hits.length, 1)
})

for (const [name, body] of [
  ['malformed JSON', `not json ${UPSTREAM_SECRET}`],
  ['empty content', JSON.stringify({ choices: [{ message: { content: '' } }] })],
  ['non-string content', JSON.stringify({ choices: [{ message: { content: { a: 1 } } }] })],
  ['missing choices', JSON.stringify({ detail: UPSTREAM_SECRET })],
]) {
  test(`rejects ${name}`, async () => {
    handle = (req, res) => res.writeHead(200).end(body)
    assert.equal(await failure(callProvider(input, options())), 'AI_PROVIDER_ERROR')
  })
}

test('aborts an oversize response', async () => {
  handle = (req, res) => {
    res.writeHead(200)
    res.write('x'.repeat(4096))
  }
  assert.equal(await failure(callProvider(input, options({ maxResponseBytes: 1024 }))), 'AI_PROVIDER_ERROR')
})

test('aborts when the deadline passes, including mid-body', async () => {
  handle = () => {}
  assert.equal(await failure(callProvider(input, options({ deadlineMs: 50 }))), 'AI_PROVIDER_ERROR')
  handle = (req, res) => {
    res.writeHead(200)
    res.write('{')
  }
  assert.equal(await failure(callProvider(input, options({ deadlineMs: 50 }))), 'AI_PROVIDER_ERROR')
})

test('fails when the connection drops before the body ends', async () => {
  handle = (req, res) => {
    res.writeHead(200)
    res.write('{')
    setTimeout(() => res.destroy(), 10)
  }
  assert.equal(await failure(callProvider(input, options())), 'AI_PROVIDER_ERROR')
})

test('refuses a stored base URL that no longer passes validation', async () => {
  const code = await failure(callProvider({ ...input, baseUrl: 'https://127.0.0.1/v1' }, options()))
  assert.equal(code, 'AI_PROVIDER_ERROR')
  assert.equal(hits.length, 0)
})

test('a private DNS answer never connects', async () => {
  const lookup = createValidatingLookup(async () => [{ address: '10.0.0.1', family: 4 }])
  assert.equal(await failure(callProvider(input, { lookup })), 'AI_PROVIDER_ERROR')
})
