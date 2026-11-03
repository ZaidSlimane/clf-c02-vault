import { getUser } from './_lib/auth.js'
import defaultSql from './_lib/db.js'

const MAX_SESSION_MINUTES = 240
const MAX_AGE_MS = 366 * 86400000
const CLOCK_SKEW_MS = 300000
const HISTORY_DAYS = 84

export function isValidSession({ startedAt, minutes } = {}, now = Date.now()) {
  return Number.isInteger(startedAt)
    && Number.isInteger(minutes)
    && minutes >= 1
    && minutes <= MAX_SESSION_MINUTES
    && startedAt <= now + CLOCK_SKEW_MS
    && startedAt >= now - MAX_AGE_MS
}

export function createHandler({ sql = defaultSql } = {}) {
  return async function handler(req, res) {
    const user = getUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    if (req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT started_at, minutes FROM study_sessions
          WHERE user_id = ${user.userId} AND started_at >= NOW() - make_interval(days => ${HISTORY_DAYS})
          ORDER BY started_at
        `
        return res.status(200).json(rows.map((r) => ({ startedAt: new Date(r.started_at).getTime(), minutes: r.minutes })))
      } catch {
        return res.status(500).json({ error: 'Failed to fetch study sessions' })
      }
    }

    if (req.method === 'POST') {
      if (!isValidSession(req.body)) return res.status(400).json({ error: 'Invalid study session' })
      try {
        await sql`
          INSERT INTO study_sessions (user_id, started_at, minutes)
          VALUES (${user.userId}, ${new Date(req.body.startedAt).toISOString()}, ${req.body.minutes})
          ON CONFLICT (user_id, started_at) DO NOTHING
        `
        return res.status(200).json({ ok: true })
      } catch {
        return res.status(500).json({ error: 'Failed to save study session' })
      }
    }

    res.status(405).json({ error: 'Method not allowed' })
  }
}

export default createHandler()
