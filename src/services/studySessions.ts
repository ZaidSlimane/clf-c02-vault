import { useEffect, useState } from 'react'

const SESSIONS_KEY = 'clf-c02-study-sessions'
const ACTIVE_KEY = 'clf-c02-active-session'
const CHANGE_EVENT = 'clf-c02-study-sessions-change'
const MAX_SESSION_MINUTES = 240

export interface StudySession {
  startedAt: number
  minutes: number
}

function readSessions(): StudySession[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
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
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([...readSessions(), { startedAt, minutes }]))
      localStorage.removeItem(ACTIVE_KEY)
    } catch {}
  }
  notify()
}

export function useStudySessions() {
  const [sessions, setSessions] = useState(readSessions)
  const [activeSince, setActiveSince] = useState(readActive)
  useEffect(() => {
    const sync = () => {
      setSessions(readSessions())
      setActiveSince(readActive())
    }
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return { sessions, activeSince }
}

/** Monday-first minutes for the current week. */
export function minutesByWeekday(sessions: StudySession[]): number[] {
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const days = [0, 0, 0, 0, 0, 0, 0]
  for (const session of sessions) {
    const day = Math.floor((session.startedAt - monday.getTime()) / 86400000)
    if (day >= 0 && day < 7) days[day] += session.minutes
  }
  return days
}
