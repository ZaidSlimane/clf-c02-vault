import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import {
  currentUserId,
  migrateLegacyKeys,
  readSession,
  readUserItem,
  removeUserItem,
  restoredWithStaleSession,
  scopedKey,
  sealLegacyKeys,
  sessionChangedForTab,
  TOKEN_KEY,
  USER_KEY,
  writeUserItem,
} from '../src/services/userStorage.ts'
import { allSessions, startSession, stopSession, syncSessions } from '../src/services/studySessions.ts'

const PROGRESS = 'clf-c02-exam-progress'
const PENDING = 'clf-c02-study-sessions'
const ACTIVE = 'clf-c02-active-session'
const MARKER = 'clf-c02-storage-scoped'
const LEGACY_KEYS = [
  'clf-c02-exam-progress',
  'clf-c02-tracker-progress',
  'clf-c02-tracker-logs',
  'clf-c02-ai-chat',
  'clf-c02-checked-topics',
  'clf-c02-exam-date',
  'clf-c02-study-sessions',
  'clf-c02-active-session',
  'clf-c02-custom-quiz-source',
  'clf-c02-custom-quiz-progress',
]

const A = { token: 'token-a', user: { id: 1, email: 'a@example.com' } }
const B = { token: 'token-b', user: { id: 2, email: 'b@example.com' } }

function fakeStorage() {
  const items = new Map()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, String(value)) },
    removeItem: (key) => { items.delete(key) },
  }
}

function signIn({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function signOut() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Answers every request from `respond`, recording what was sent and with which token.
function fakeFetch(respond = () => ({ ok: true, status: 200, json: async () => [] })) {
  const calls = []
  globalThis.fetch = async (url, init = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      authorization: init.headers?.Authorization,
      body: init.body ? JSON.parse(init.body) : undefined,
    })
    return respond(init)
  }
  return calls
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage()
  globalThis.window = new EventTarget()
  fakeFetch()
})

test('scoped data is invisible to another account and returns to its owner', () => {
  signIn(A)
  writeUserItem(PROGRESS, 'a-data')
  signOut()
  signIn(B)
  assert.equal(readUserItem(PROGRESS), null)
  writeUserItem(PROGRESS, 'b-data')
  signOut()
  signIn(A)
  assert.equal(readUserItem(PROGRESS), 'a-data')
})

test('removing an item only touches the current account', () => {
  signIn(A)
  writeUserItem(PROGRESS, 'a-data')
  signOut()
  signIn(B)
  writeUserItem(PROGRESS, 'b-data')
  removeUserItem(PROGRESS)
  assert.equal(readUserItem(PROGRESS), null)
  assert.equal(localStorage.getItem(scopedKey(PROGRESS, A.user.id)), 'a-data')
})

test('reads, writes and removes do nothing while signed out', () => {
  signIn(A)
  writeUserItem(PROGRESS, 'a-data')
  signOut()
  const before = [...localStorage.items]
  assert.equal(readUserItem(PROGRESS), null)
  writeUserItem(PROGRESS, 'stray')
  removeUserItem(PROGRESS)
  assert.deepEqual([...localStorage.items], before)
  assert.equal(localStorage.getItem(scopedKey(PROGRESS, A.user.id)), 'a-data')
})

test('readSession returns the stored session', () => {
  signIn(A)
  assert.deepEqual(readSession(), A)
  assert.equal(currentUserId(), 1)
})

test('readSession rejects corrupt or partial sessions', () => {
  const cases = [
    [A.token, '{not json'],
    [A.token, 'null'],
    [A.token, JSON.stringify({ id: '1', email: A.user.email })],
    [A.token, JSON.stringify({ id: 1 })],
    ['', JSON.stringify(A.user)],
    [null, JSON.stringify(A.user)],
    [A.token, null],
  ]
  for (const [token, user] of cases) {
    globalThis.localStorage = fakeStorage()
    if (token !== null) localStorage.setItem(TOKEN_KEY, token)
    if (user !== null) localStorage.setItem(USER_KEY, user)
    assert.equal(readSession(), null, `token=${token} user=${user}`)
  }
})

test('migration adopts legacy keys for the signed-in user', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  signIn(A)
  migrateLegacyKeys()
  assert.equal(readUserItem(PROGRESS), 'legacy')
  assert.equal(localStorage.getItem(PROGRESS), null)
})

test('migration adopts every per-user legacy key', () => {
  for (const key of LEGACY_KEYS) localStorage.setItem(key, `legacy ${key}`)
  signIn(A)
  migrateLegacyKeys()
  for (const key of LEGACY_KEYS) {
    assert.equal(readUserItem(key), `legacy ${key}`, key)
    assert.equal(localStorage.getItem(key), null, key)
  }
})

test('migration does not overwrite scoped data', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  signIn(A)
  writeUserItem(PROGRESS, 'scoped')
  migrateLegacyKeys()
  assert.equal(readUserItem(PROGRESS), 'scoped')
})

test('migration with nobody signed in adopts nothing and keeps legacy keys', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  migrateLegacyKeys()
  assert.equal(localStorage.getItem(MARKER), '1')
  assert.equal(localStorage.getItem(PROGRESS), 'legacy')
})

test('a sign-in after a signed-out first load still adopts nothing', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  migrateLegacyKeys()
  signIn(B)
  migrateLegacyKeys()
  assert.equal(readUserItem(PROGRESS), null)
  assert.equal(localStorage.getItem(PROGRESS), 'legacy')
})

test('a second migration run is a no-op', () => {
  signIn(A)
  migrateLegacyKeys()
  localStorage.setItem(PROGRESS, 'written by a stale tab')
  migrateLegacyKeys()
  assert.equal(readUserItem(PROGRESS), null)
  assert.equal(localStorage.getItem(PROGRESS), 'written by a stale tab')
})

test('migration still sets the marker when a copy fails', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  signIn(A)
  const setItem = localStorage.setItem
  localStorage.setItem = (key, value) => {
    if (key === scopedKey(PROGRESS, A.user.id)) throw new Error('quota')
    setItem(key, value)
  }
  migrateLegacyKeys()
  assert.equal(localStorage.getItem(MARKER), '1')
  assert.equal(localStorage.getItem(PROGRESS), 'legacy')
})

test('a failed marker write while signed out still adopts nothing after a fresh sign-in', () => {
  localStorage.setItem(PROGRESS, 'legacy')
  const setItem = localStorage.setItem
  localStorage.setItem = () => { throw new Error('quota') }
  migrateLegacyKeys()
  assert.equal(localStorage.getItem(MARKER), null)
  localStorage.setItem = setItem
  sealLegacyKeys()
  signIn(B)
  migrateLegacyKeys()
  assert.equal(readUserItem(PROGRESS), null)
  assert.equal(localStorage.getItem(PROGRESS), 'legacy')
})

test('sessionChangedForTab detects an account change', () => {
  signIn(B)
  assert.equal(sessionChangedForTab(USER_KEY, A.user.id), true)
  assert.equal(sessionChangedForTab(null, A.user.id), true)
  signOut()
  assert.equal(sessionChangedForTab(USER_KEY, A.user.id), true)
})

test('sessionChangedForTab ignores the same user and unrelated keys', () => {
  signIn(A)
  assert.equal(sessionChangedForTab(USER_KEY, A.user.id), false)
  assert.equal(sessionChangedForTab(null, A.user.id), false)
  assert.equal(sessionChangedForTab(PROGRESS, B.user.id), false)
  assert.equal(sessionChangedForTab(TOKEN_KEY, B.user.id), false)
})

test('restoredWithStaleSession detects a restored page showing another account', () => {
  signIn(B)
  assert.equal(restoredWithStaleSession(true, A.user.id), true)
  assert.equal(restoredWithStaleSession(true, null), true)
  signOut()
  assert.equal(restoredWithStaleSession(true, A.user.id), true)
})

test('restoredWithStaleSession ignores normal loads and the same account', () => {
  signIn(A)
  assert.equal(restoredWithStaleSession(false, B.user.id), false)
  assert.equal(restoredWithStaleSession(true, A.user.id), false)
  signOut()
  assert.equal(restoredWithStaleSession(true, null), false)
})

test("A's pending and active sessions are not sent with B's token", async () => {
  signIn(A)
  writeUserItem(PENDING, JSON.stringify([{ startedAt: 1000, minutes: 5 }]))
  startSession()
  signOut()
  signIn(B)
  const calls = fakeFetch()
  stopSession()
  await syncSessions()
  assert.deepEqual(calls.filter((c) => c.method === 'POST'), [])
  signOut()
  signIn(A)
  assert.notEqual(readUserItem(ACTIVE), null)
  assert.equal(JSON.parse(readUserItem(PENDING)).length, 1)
})

test('pending sessions upload for their owner', async () => {
  signIn(A)
  writeUserItem(PENDING, JSON.stringify([{ startedAt: 1000, minutes: 5 }]))
  const calls = fakeFetch()
  await syncSessions()
  const posts = calls.filter((c) => c.method === 'POST')
  assert.equal(posts.length, 1)
  assert.equal(posts[0].authorization, `Bearer ${A.token}`)
  assert.deepEqual(JSON.parse(readUserItem(PENDING)), [])
})

test('a switch during upload stops the remaining sessions', async () => {
  signIn(A)
  writeUserItem(PENDING, JSON.stringify([{ startedAt: 1000, minutes: 5 }, { startedAt: 2000, minutes: 5 }]))
  const calls = fakeFetch(() => {
    signOut()
    signIn(B)
    return { ok: true, status: 200, json: async () => [] }
  })
  await syncSessions()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].authorization, `Bearer ${A.token}`)
})

test("A's saved sessions are not returned for B", async () => {
  signIn(A)
  const rows = [{ startedAt: 1000, minutes: 5 }]
  fakeFetch(() => ({ ok: true, status: 200, json: async () => rows }))
  await syncSessions()
  assert.deepEqual(allSessions(), rows)
  signOut()
  signIn(B)
  assert.deepEqual(allSessions(), [])
  signOut()
  signIn(A)
  assert.deepEqual(allSessions(), rows)
})

test('a GET begun as A and resolving after the switch is dropped', async () => {
  signIn(B)
  await syncSessions()
  signOut()
  signIn(A)
  fakeFetch(() => ({
    ok: true,
    status: 200,
    json: async () => {
      signOut()
      signIn(B)
      return [{ startedAt: 3000, minutes: 5 }]
    },
  }))
  await syncSessions()
  assert.deepEqual(allSessions(), [])
  signOut()
  signIn(A)
  assert.deepEqual(allSessions(), [])
})

test('nothing is requested while signed out', async () => {
  const calls = fakeFetch()
  await syncSessions()
  assert.deepEqual(calls, [])
})
