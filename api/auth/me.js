import jwt from 'jsonwebtoken'
import sql, { initDb } from '../db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    await initDb()
    const result = await sql`SELECT id, email, created_at FROM users WHERE id = ${payload.userId}`
    if (result.length === 0) return res.status(404).json({ error: 'User not found' })
    res.status(200).json({ user: result[0] })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
