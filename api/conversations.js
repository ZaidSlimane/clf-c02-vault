import jwt from 'jsonwebtoken'
import sql, { initDb } from './db.js'

function getUser(auth) {
  if (!auth || !auth.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET) } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = getUser(req.headers.authorization)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  await initDb()

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, question_text, answer, created_at
        FROM ai_conversations
        WHERE user_id = ${user.userId}
        ORDER BY created_at DESC
        LIMIT 100
      `
      return res.status(200).json(rows)
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch conversations' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { question_text, answer } = req.body || {}
      if (!question_text || !answer) return res.status(400).json({ error: 'question_text and answer are required' })

      const result = await sql`
        INSERT INTO ai_conversations (user_id, question_text, answer)
        VALUES (${user.userId}, ${question_text}, ${answer})
        RETURNING id, question_text, answer, created_at
      `
      return res.status(201).json(result[0])
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save conversation' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM ai_conversations WHERE user_id = ${user.userId}`
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to clear conversations' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
