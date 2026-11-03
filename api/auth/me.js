import { getUser } from '../_lib/auth.js'
import sql from '../_lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = getUser(req.headers.authorization)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await sql`SELECT id, email, created_at FROM users WHERE id = ${user.userId}`
    if (result.length === 0) return res.status(404).json({ error: 'User not found' })
    res.status(200).json({ user: result[0] })
  } catch {
    res.status(500).json({ error: 'Failed to load user' })
  }
}
