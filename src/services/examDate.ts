import { useEffect, useState } from 'react'

const STORAGE_KEY = 'clf-c02-exam-date'
const CHANGE_EVENT = 'clf-c02-exam-date-change'

function readExamDate(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveExamDate(date: string): void {
  try {
    if (date) localStorage.setItem(STORAGE_KEY, date)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useExamDate(): string {
  const [date, setDate] = useState(readExamDate)
  useEffect(() => {
    const sync = () => setDate(readExamDate())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return date
}

export function formatExamDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function daysUntilExam(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)
}
