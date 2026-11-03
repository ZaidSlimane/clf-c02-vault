import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertPublicHost,
  BaseUrlError,
  createValidatingLookup,
  isBlockedAddress,
  normalizeBaseUrl,
} from '../api/_lib/ssrf.js'

const GENERIC = 'This base URL is not allowed'
const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }]

async function check(input, resolver = publicResolver) {
  const url = normalizeBaseUrl(input)
  await assertPublicHost(new URL(url).hostname, resolver)
  return url
}

for (const input of [
  'http://example.com',
  'https://127.0.0.1',
  'https://127.0.0.1.',
  'https://2130706433',
  'https://0x7f.1',
  'https://0177.0.0.1',
  'https://[::1]',
  'https://[::ffff:127.0.0.1]',
  'https://169.254.169.254',
  'https://localhost',
  'https://localhost.',
  'https://LOCALHOST',
  'https://foo.localhost',
  'https://printer.local',
  'https://metadata.google.internal',
  'https://user:pw@example.com',
  'https://example.com:8443',
  'https://example.com/v1?x=1',
  'https://example.com/v1#frag',
  'https://example.com/v1?',
  'not a url',
  '',
  `https://example.com/${'a'.repeat(2048)}`,
]) {
  test(`rejects ${input.slice(0, 60) || '(empty)'}`, async () => {
    await assert.rejects(() => check(input), BaseUrlError)
  })
}

test('rejects non-string input', () => {
  assert.throws(() => normalizeBaseUrl(undefined), BaseUrlError)
  assert.throws(() => normalizeBaseUrl({}), BaseUrlError)
})

test('accepts public providers with a stubbed resolver', async () => {
  assert.equal(await check('https://api.openai.com/v1'), 'https://api.openai.com/v1')
  assert.equal(await check('https://inference.dahl.global/v1'), 'https://inference.dahl.global/v1')
})

test('normalises trailing slashes and the explicit default port', async () => {
  assert.equal(await check('https://api.openai.com:443/v1///'), 'https://api.openai.com/v1')
  assert.equal(await check('https://api.openai.com/'), 'https://api.openai.com')
})

test('rejects a host resolving to mixed public and private addresses', async () => {
  const resolver = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.5', family: 4 },
  ]
  await assert.rejects(() => check('https://rebind.example.com', resolver), { message: GENERIC })
})

test('uses one generic message for DNS failures and empty results', async () => {
  const failing = async () => { throw new Error('ENOTFOUND secret.internal.host') }
  await assert.rejects(() => check('https://missing.example.com', failing), { message: GENERIC })
  await assert.rejects(() => check('https://empty.example.com', async () => []), { message: GENERIC })
})

test('blocks every listed address range', () => {
  for (const address of [
    '0.1.2.3', '10.0.0.1', '100.64.0.1', '100.127.255.255', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '172.31.255.255', '192.0.0.1', '192.0.2.1', '192.168.1.1', '198.18.0.1',
    '198.19.255.255', '198.51.100.1', '203.0.113.1', '224.0.0.1', '240.0.0.1', '255.255.255.255',
    '::', '::1', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1', '2001:db8::1',
    '::ffff:127.0.0.1', '::ffff:8.8.8.8', '::ffff:0:7f00:1', '64:ff9b::7f00:1', '2002:7f00:1::', '2001:0:1::1', '::7f00:1',
  ]) {
    assert.equal(isBlockedAddress(address), true, address)
  }
})

test('allows public addresses, and blocks anything that is not an address', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '100.63.255.255', '172.32.0.1', '2606:4700:4700::1111']) {
    assert.equal(isBlockedAddress(address), false, address)
  }
  assert.equal(isBlockedAddress('example.com'), true)
})

function runLookup(lookup, options) {
  return new Promise((resolve) => {
    lookup('example.com', options, (err, address, family) => resolve({ err, address, family }))
  })
}

test('the validating lookup returns addresses in both callback shapes', async () => {
  const lookup = createValidatingLookup(publicResolver)
  const single = await runLookup(lookup, {})
  assert.equal(single.address, '93.184.216.34')
  assert.equal(single.family, 4)
  const all = await runLookup(lookup, { all: true })
  assert.deepEqual(all.address, [{ address: '93.184.216.34', family: 4 }])
})

test('the validating lookup rejects a private answer at connect time', async () => {
  const lookup = createValidatingLookup(async () => [{ address: '127.0.0.1', family: 4 }])
  assert.ok((await runLookup(lookup, { all: true })).err instanceof BaseUrlError)
})
