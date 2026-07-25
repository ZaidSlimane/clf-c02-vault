import jwt from 'jsonwebtoken'
import sql, { initDb } from './db.js'

function getUser(auth) {
  if (!auth || !auth.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET) } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = getUser(req.headers.authorization)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  await initDb()

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT data FROM tracker_progress WHERE user_id = ${user.userId}`
      return res.status(200).json(rows.length > 0 ? rows[0].data : {})
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch tracker' })
    }
  }

  if (req.method === 'POST') {
    try {
      await sql`
        INSERT INTO tracker_progress (user_id, data, updated_at)
        VALUES (${user.userId}, ${JSON.stringify(req.body)}, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save tracker' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
