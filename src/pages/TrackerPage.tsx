import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { courseDomains, getTotalLectures } from '../data/courseData'
import { readUserItem, writeUserItem } from '../services/userStorage'

type LectureProgress = Record<string, boolean>

const STORAGE_KEY = 'clf-c02-tracker-progress'
const LOG_STORAGE_KEY = 'clf-c02-tracker-logs'

function loadLocal(): LectureProgress {
  try {
    const saved = readUserItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function highlight(text: string, query: string): JSX.Element {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return <>{parts.map((p, i) => regex.test(p) ? <mark key={i} className="tr-match">{p}</mark> : p)}</>
}

function matchesQuery(text: string, query: string): boolean {
  if (!query.trim()) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

type LogEntry = { id: number; time: string; text: string; kind: 'check' | 'uncheck' }

function loadLogs(): LogEntry[] {
  try {
    const saved = readUserItem(LOG_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

let logSeq = 0

function loadLogsAndSeq(): LogEntry[] {
  const logs = loadLogs()
  logSeq = logs.reduce((max, e) => Math.max(max, e.id), logSeq)
  return logs
}

export default function TrackerPage() {
  const { token } = useAuth()
  const [lectures, setLectures] = useState<LectureProgress>(loadLocal)
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [log, setLog] = useState<LogEntry[]>(loadLogsAndSeq)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [logSyncing, setLogSyncing] = useState(false)
  const lecturesReady = useRef(false)
  const logsReady = useRef(false)
  const lectureSyncTimer = useRef<ReturnType<typeof setTimeout>>()
  const logSyncTimer = useRef<ReturnType<typeof setTimeout>>()
  const pendingLectureUpload = useRef<{ token: string; lectures: LectureProgress } | null>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView()
  }, [log.length])

  useEffect(() => {
    writeUserItem(LOG_STORAGE_KEY, JSON.stringify(log))
    if (!token || !logsReady.current) return
    logSyncTimer.current = setTimeout(async () => {
      setLogSyncing(true)
      try {
        await fetch('/api/tracker-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(log),
        })
      } catch {}
      setLogSyncing(false)
    }, 3000)
    return () => clearTimeout(logSyncTimer.current)
  }, [log, token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch('/api/tracker-logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !Array.isArray(data)) return
        logsReady.current = true
        if (data.length === 0) {
          // A new array re-runs the upload effect, so local entries still reach an empty server list.
          setLog(prev => prev.length > 0 ? [...prev] : prev)
        } else {
          setLog(prev => {
            const localIds = new Set(prev.map(e => e.id))
            const merged = [...prev]
            for (const entry of data) {
              if (!localIds.has(entry.id)) {
                merged.push(entry)
                if (entry.id > logSeq) logSeq = entry.id
              }
            }
            merged.sort((a, b) => a.id - b.id)
            return merged.slice(-50)
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token])

  function pushLog(text: string, kind: 'check' | 'uncheck') {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { hour12: false })
    setLog(prev => [...prev.slice(-49), { id: ++logSeq, time, text, kind }])
  }

  const total = useMemo(() => getTotalLectures(), [])
  const completed = useMemo(() => Object.values(lectures).filter(Boolean).length, [lectures])
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  useEffect(() => {
    writeUserItem(STORAGE_KEY, JSON.stringify(lectures))
    pendingLectureUpload.current = null
    if (!token || !lecturesReady.current) return
    pendingLectureUpload.current = { token, lectures }
    lectureSyncTimer.current = setTimeout(async () => {
      pendingLectureUpload.current = null
      setSyncing(true)
      try {
        await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(lectures),
        })
      } catch {}
      setSyncing(false)
    }, 2000)
    return () => clearTimeout(lectureSyncTimer.current)
  }, [lectures, token])

  // Without this, leaving before the timer fires drops an uncheck and the server's value restores the check.
  useEffect(() => () => {
    const upload = pendingLectureUpload.current
    if (!upload || !lecturesReady.current) return
    pendingLectureUpload.current = null
    fetch('/api/tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${upload.token}` },
      body: JSON.stringify(upload.lectures),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch('/api/tracker', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
        lecturesReady.current = true
        const merged = { ...loadLocal(), ...data }
        writeUserItem(STORAGE_KEY, JSON.stringify(merged))
        setLectures(merged)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (search.trim()) {
      const toOpenDomains: Record<string, boolean> = {}
      const toOpenSections: Record<string, boolean> = {}
      for (const d of courseDomains) {
        for (const s of d.sections) {
          const sectionMatch = matchesQuery(s.title, search)
          for (const l of s.lectures) {
            if (sectionMatch || matchesQuery(l.title, search) || matchesQuery(l.id, search)) {
              toOpenDomains[d.id] = true
              toOpenSections[s.id] = true
            }
          }
        }
      }
      setOpenDomains(toOpenDomains)
      setOpenSections(toOpenSections)
    }
  }, [search])

  const searchMatches = useMemo(() => {
    if (!search.trim()) return null
    const matchIds = new Set<string>()
    for (const d of courseDomains) {
      for (const s of d.sections) {
        const sectionMatch = matchesQuery(s.title, search)
        for (const l of s.lectures) {
          if (sectionMatch || matchesQuery(l.title, search) || matchesQuery(l.id, search)) {
            matchIds.add(l.id)
          }
        }
      }
    }
    return matchIds
  }, [search])

  const toggle = useCallback((id: string, title: string) => {
    setLectures(prev => {
      const next = !prev[id]
      pushLog(`${next ? '✓' : '✗'} ${id} — ${title}`, next ? 'check' : 'uncheck')
      return { ...prev, [id]: next }
    })
  }, [])

  const toggleDomain = (id: string) => setOpenDomains(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSection = (id: string) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))

  function domainCompleted(domainId: string): number {
    const d = courseDomains.find(d => d.id === domainId)
    if (!d) return 0
    let count = 0
    for (const s of d.sections) {
      for (const l of s.lectures) {
        if (lectures[l.id]) count++
      }
    }
    return count
  }

  function domainTotal(domainId: string): number {
    const d = courseDomains.find(d => d.id === domainId)
    if (!d) return 0
    return d.sections.reduce((sum, s) => sum + s.lectures.length, 0)
  }

  function sectionCompleted(sectionId: string): number {
    let count = 0
    for (const d of courseDomains) {
      for (const s of d.sections) {
        if (s.id === sectionId) {
          for (const l of s.lectures) {
            if (lectures[l.id]) count++
          }
        }
      }
    }
    return count
  }

  function sectionTotal(sectionId: string): number {
    for (const d of courseDomains) {
      for (const s of d.sections) {
        if (s.id === sectionId) return s.lectures.length
      }
    }
    return 0
  }

  return (
    <div className="tracker-page">
      <div className="tracker-hero">
        <div className="tracker-hero__copy">
          <span className="vault-eyebrow">COURSE TRACKER · ACTIVE ROUTE</span>
          <h1>AWS Cloud Practitioner course</h1>
          <p className="tracker-hero-sub">By Stephane Maarek. Check off each lecture as you finish it.</p>
          <div className="tracker-hero-stats">
            <div className="tracker-hero-stat"><span className="tracker-hero-pct">{pct}%</span><span className="tracker-hero-label">Complete</span></div>
            <div className="tracker-hero-stat"><span className="tracker-hero-count">{completed}<span className="tracker-hero-total">/{total}</span></span><span className="tracker-hero-label">Lectures</span></div>
          </div>
          <div className="tracker-hero-bar"><div className="tracker-hero-bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="tracker-hero__waypoint">
          <span className="vault-eyebrow">ROUTE STATUS</span>
          <strong>{completed === total ? 'COURSE COMPLETE' : 'IN PROGRESS'}</strong>
          <p>{total - completed} lecture{total - completed !== 1 ? 's' : ''} remain on this route.</p>
          <div className="tracker-route-dots"><i /><i /><i /><i /><i /></div>
        </div>

        <div className="tracker-hero-legend">
          {courseDomains.map(d => {
            const dc = domainCompleted(d.id)
            const dt = domainTotal(d.id)
            const dp = dt > 0 ? Math.round((dc / dt) * 100) : 0
            return (
              <div key={d.id} className="tracker-legend-item">
                <span className="tracker-legend-dot" style={{ background: d.color }} />
                <span className="tracker-legend-label">{d.title}</span>
                <span className="tracker-legend-pct">{dp}%</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="tracker-search">
        <input
          ref={searchRef}
          type="text"
          className="tracker-search-input"
          placeholder="Search lectures, sections, or IDs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <span className="tracker-search-count">
            {searchMatches ? searchMatches.size : 0} match{searchMatches?.size !== 1 ? 'es' : ''}
          </span>
        )}
        {search && (
          <button className="tracker-search-clear" onClick={() => { setSearch(''); setOpenDomains({}); setOpenSections({}) }}>
            ✕
          </button>
        )}
      </div>

      <div className="tracker-domains">{courseDomains.map(domain => {
          const dc = domainCompleted(domain.id)
          const dt = domainTotal(domain.id)
          const dp = dt > 0 ? Math.round((dc / dt) * 100) : 0
          const isOpen = openDomains[domain.id] ?? false

          return (
            <div key={domain.id} className="tracker-domain" style={{ borderLeftColor: domain.color }}>
              <button className="tracker-domain-header" onClick={() => toggleDomain(domain.id)}>
                <div className="tracker-domain-title-row">
                  <span className="tracker-domain-expand">{isOpen ? '▾' : '▸'}</span>
                  <span className="tracker-domain-title">{domain.title}</span>
                  {domain.weight > 0 && <span className="tracker-domain-weight">{domain.weight}%</span>}
                </div>
                <div className="tracker-domain-meta">
                  <span className="tracker-domain-nums">{dc}/{dt}</span>
                  <div className="tracker-domain-bar">
                    <div className="tracker-domain-bar-fill" style={{ width: `${dp}%`, background: domain.color }} />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="tracker-sections">
                  {domain.sections.map(section => {
                    const sc = sectionCompleted(section.id)
                    const st = sectionTotal(section.id)
                    const sp = st > 0 ? Math.round((sc / st) * 100) : 0
                    const secOpen = openSections[section.id] ?? false

                    return (
                      <div key={section.id} className="tracker-section">
                        <button className="tracker-section-header" onClick={() => toggleSection(section.id)}>
                          <div className="tracker-section-title-row">
                            <span className="tracker-section-expand">{secOpen ? '▾' : '▸'}</span>
                            <span className="tracker-section-title">{section.title}</span>
                          </div>
                          <div className="tracker-section-meta">
                            <span className="tracker-section-nums">{sc}/{st}</span>
                            <div className="tracker-section-bar">
                              <div className="tracker-section-bar-fill" style={{ width: `${sp}%`, background: domain.color }} />
                            </div>
                          </div>
                        </button>

              {secOpen && (
                  <div className="tracker-lectures">
                    {section.lectures
                      .filter(l => !searchMatches || searchMatches.has(l.id))
                      .map(l => (
                      <label key={l.id} className="tracker-lecture">
                        <input
                          type="checkbox"
                          className="tracker-lecture-checkbox"
                          checked={!!lectures[l.id]}
                          onChange={() => toggle(l.id, l.title)}
                        />
                        <span className="tracker-lecture-id">{highlight(l.id, search)}</span>
                        <span className="tracker-lecture-title">{highlight(l.title, search)}</span>
                      </label>
                    ))}
                  </div>
                )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="tracker-log">
        <div className="tracker-log-header">
          <span className="tracker-log-title">Activity Log</span>
          <span className="tracker-log-count">{log.length} entries{logSyncing ? ' • syncing…' : ''}</span>
          {log.length > 0 && (
            <button className="tracker-log-clear" onClick={() => setLog([])}>Clear</button>
          )}
        </div>
        <div className="tracker-log-body">
          {log.length === 0 ? (
            <div className="tracker-log-empty">No activity yet — check a lecture to begin.</div>
          ) : (
            log.map(e => (
              <div key={e.id} className={`tracker-log-line tracker-log-${e.kind}`}>
                <span className="tracker-log-time">[{e.time}]</span>
                <span className="tracker-log-text">{e.text}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      <div className="tracker-footer">
        <span>{completed} / {total} lectures completed ({pct}%)</span>
        {syncing && <span className="tracker-syncing">Syncing...</span>}
      </div>
    </div>
  )
}
