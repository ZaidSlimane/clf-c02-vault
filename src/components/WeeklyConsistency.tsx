import { useEffect, useState } from 'react'
import { minutesByWeekday, sessionsInWeek, startSession, stopSession, useStudySessions } from '../services/studySessions'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
}

export default function WeeklyConsistency() {
  const { sessions, activeSince } = useStudySessions()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!activeSince) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [activeSince])

  const thisWeek = sessionsInWeek(sessions)
  const days = minutesByWeekday(thisWeek)
  const totalMinutes = days.reduce((sum, m) => sum + m, 0)
  const sessionCount = thisWeek.length
  const lastWeekMinutes = sessionsInWeek(sessions, -1).reduce((sum, s) => sum + s.minutes, 0)
  const change = totalMinutes - lastWeekMinutes
  const busiest = Math.max(...days, 1)
  const today = (new Date().getDay() + 6) % 7

  return (
    <div className="session-tracker">
      <div className="session-tracker__timer">
        <strong>{activeSince ? formatElapsed(Math.max(now - activeSince, 0)) : `${Math.round((totalMinutes / 60) * 10) / 10} h`}</strong>
        <button
          type="button"
          className={`vault-button ${activeSince ? 'vault-button--quiet' : 'vault-button--primary'}`}
          onClick={activeSince ? stopSession : startSession}
        >
          {activeSince ? 'Stop session' : 'Start session'}
        </button>
      </div>
      <p className="session-tracker__summary">
        {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'} · {totalMinutes} minutes · {change >= 0 ? '+' : ''}{change} vs last week
      </p>
      <div className="session-week" role="img" aria-label={`${totalMinutes} minutes studied this week`}>
        {days.map((minutes, i) => (
          <div key={i} className={`session-day ${i === today ? 'session-day--today' : ''}`}>
            <div className="session-day__track" title={`${minutes} min`}>
              <div className="session-day__fill" style={{ height: `${(minutes / busiest) * 100}%` }} />
            </div>
            <span>{WEEKDAYS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
