import { useEffect, useState } from 'react'
import type { Domain } from '../data/domains'

const STORAGE_KEY = 'clf-c02-checked-topics'
const CHANGE_EVENT = 'clf-c02-checked-topics-change'

function readCheckedTopics(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function toggleTopic(key: string): void {
  const checked = readCheckedTopics()
  const next = checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useCheckedTopics(): string[] {
  const [checked, setChecked] = useState(readCheckedTopics)
  useEffect(() => {
    const sync = () => setChecked(readCheckedTopics())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return checked
}

export function domainTopics(domain: Domain) {
  return domain.subNotes.flatMap((note) =>
    note.content.map((topic, i) => ({ ...topic, noteTitle: note.title, key: `${domain.id}:${note.id}:${i}` })),
  )
}

export function domainProgress(domain: Domain, checked: string[]) {
  const topics = domainTopics(domain)
  const done = topics.filter((t) => checked.includes(t.key)).length
  const mastery = topics.length ? Math.round((done / topics.length) * 100) : 0
  const status: Domain['status'] = done === 0 ? 'not-started' : done === topics.length ? 'complete' : 'in-progress'
  const nextTopic = topics.find((t) => !checked.includes(t.key))?.section ?? 'All topics checked'
  return { done, total: topics.length, mastery, status, nextTopic }
}
