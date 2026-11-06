import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import defaultSql from '../_lib/db.js'

export function createHandler({ sql = defaultSql } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    try {
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`
      if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' })

      const passwordHash = await bcrypt.hash(password, 10)
      const result = await sql`
        INSERT INTO users (email, password_hash)
        VALUES (${email}, ${passwordHash})
        RETURNING id, email, created_at
      `
      const user = result[0]
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.status(201).json({ user: { id: user.id, email: user.email }, token })
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' })
    }
  }
}

export default createHandler()
