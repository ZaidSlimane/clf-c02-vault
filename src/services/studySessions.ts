import { useEffect, useState } from 'react'
import { headers } from './api.ts'
import { TOKEN_KEY } from './userStorage.ts'

const PENDING_KEY = 'clf-c02-study-sessions'
const ACTIVE_KEY = 'clf-c02-active-session'
const CHANGE_EVENT = 'clf-c02-study-sessions-change'
const MAX_SESSION_MINUTES = 240

export interface StudySession {
  startedAt: number
  minutes: number
}

let savedSessions: StudySession[] = []

function readPending(): StudySession[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function writePending(sessions: StudySession[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(sessions))
  } catch {}
}

function readActive(): number | null {
  try {
    return Number(localStorage.getItem(ACTIVE_KEY)) || null
  } catch {
    return null
  }
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function allSessions(): StudySession[] {
  const known = new Set(savedSessions.map((s) => s.startedAt))
  return [...savedSessions, ...readPending().filter((s) => !known.has(s.startedAt))]
}

/** Uploads finished sessions, keeping any that fail for the next attempt, then reloads from the server. */
async function syncSessions(): Promise<void> {
  if (!localStorage.getItem(TOKEN_KEY)) return
  for (const session of readPending()) {
    try {
      const res = await fetch('/api/study-sessions', { method: 'POST', headers: headers(), body: JSON.stringify(session) })
      if (res.ok || res.status === 400) writePending(readPending().filter((s) => s.startedAt !== session.startedAt))
    } catch {}
  }
  try {
    const res = await fetch('/api/study-sessions', { headers: headers() })
    if (res.ok) savedSessions = await res.json()
  } catch {}
  notify()
}

export function startSession(): void {
  try {
    localStorage.setItem(ACTIVE_KEY, String(Date.now()))
  } catch {}
  notify()
}

export function stopSession(): void {
  const startedAt = readActive()
  if (startedAt) {
    const elapsed = Math.round((Date.now() - startedAt) / 60000)
    const minutes = Math.min(Math.max(elapsed, 1), MAX_SESSION_MINUTES)
    writePending([...readPending(), { startedAt, minutes }])
    try {
      localStorage.removeItem(ACTIVE_KEY)
    } catch {}
  }
  notify()
  syncSessions()
}

export function useStudySessions() {
  const [sessions, setSessions] = useState(allSessions)
  const [activeSince, setActiveSince] = useState(readActive)
  useEffect(() => {
    const sync = () => {
      setSessions(allSessions())
      setActiveSince(readActive())
    }
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    syncSessions()
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return { sessions, activeSince }
}

/** Sessions of a Monday-first week: 0 is this week, -1 is last week. */
export function sessionsInWeek(sessions: StudySession[], weekOffset = 0): StudySession[] {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return sessions.filter((s) => s.startedAt >= start.getTime() && s.startedAt < end.getTime())
}

/** Monday-first minutes for the given sessions. */
export function minutesByWeekday(sessions: StudySession[]): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0]
  for (const session of sessions) days[(new Date(session.startedAt).getDay() + 6) % 7] += session.minutes
  return days
}
