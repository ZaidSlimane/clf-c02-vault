// No relative imports and erasable TypeScript only, so Node can import this file directly in tests.

export const TOKEN_KEY = 'clf-c02-auth-token'
export const USER_KEY = 'clf-c02-auth-user'

const MIGRATION_MARKER = 'clf-c02-storage-scoped'

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

export interface SessionUser {
  id: number
  email: string
}

export interface StoredSession {
  token: string
  user: SessionUser
}

export function scopedKey(base: string, userId: number): string {
  return `${base}:u${userId}`
}

/** The stored session, or null when it is missing, partial or malformed. */
export function readSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    if (!token || typeof user?.id !== 'number' || typeof user.email !== 'string') return null
    return { token, user: { id: user.id, email: user.email } }
  } catch {
    return null
  }
}

export function currentUserId(): number | null {
  return readSession()?.user.id ?? null
}

export function readUserItem(base: string): string | null {
  const userId = currentUserId()
  if (userId === null) return null
  try {
    return localStorage.getItem(scopedKey(base, userId))
  } catch {
    return null
  }
}

export function writeUserItem(base: string, value: string): void {
  const userId = currentUserId()
  if (userId === null) return
  try {
    localStorage.setItem(scopedKey(base, userId), value)
  } catch {}
}

export function removeUserItem(base: string): void {
  const userId = currentUserId()
  if (userId === null) return
  try {
    localStorage.removeItem(scopedKey(base, userId))
  } catch {}
}

/**
 * Gives unscoped data to the user signed in on the first load after the upgrade.
 * The marker is set even when nobody is signed in: unscoped data has no known owner,
 * so handing it to a later sign-in would leak it into that account.
 */
export function migrateLegacyKeys(): void {
  try {
    if (localStorage.getItem(MIGRATION_MARKER)) return
  } catch {
    return
  }
  const userId = currentUserId()
  if (userId !== null) {
    for (const base of LEGACY_KEYS) {
      try {
        const value = localStorage.getItem(base)
        if (value === null) continue
        const target = scopedKey(base, userId)
        if (localStorage.getItem(target) === null) localStorage.setItem(target, value)
        localStorage.removeItem(base)
      } catch {}
    }
  }
  try {
    localStorage.setItem(MIGRATION_MARKER, '1')
  } catch {}
}

/** Whether a `storage` event means this tab is rendering a different account from the stored one. */
export function sessionChangedForTab(eventKey: string | null, renderedUserId: number | null): boolean {
  if (eventKey !== USER_KEY && eventKey !== null) return false
  return currentUserId() !== renderedUserId
}
