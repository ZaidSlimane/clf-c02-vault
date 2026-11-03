import { getUser } from './_lib/auth.js'
import sql from './_lib/db.js'

export default async function handler(req, res) {
  const user = getUser(req.headers.authorization)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT data FROM user_progress WHERE user_id = ${user.userId}
      `
      return res.status(200).json(rows.length > 0 ? rows[0].data : { answers: {}, flags: {}, notes: {}, tags: {} })
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch progress' })
    }
  }

  if (req.method === 'POST') {
    try {
      await sql`
        INSERT INTO user_progress (user_id, data, updated_at)
        VALUES (${user.userId}, ${JSON.stringify(req.body)}, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save progress' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
