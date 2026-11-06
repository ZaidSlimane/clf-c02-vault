import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import defaultSql from '../_lib/db.js'

const INVALID = 'Invalid username, email or password'

export function createHandler({ sql = defaultSql } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { identifier, password } = req.body || {}
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
      return res.status(400).json({ error: 'Username or email and password required' })
    }
    const trimmed = identifier.trim()
    const key = trimmed.toLowerCase()

    try {
      // Older accounts may differ only by email case, so an exact match wins.
      const result = await sql`
        SELECT * FROM users
        WHERE LOWER(email) = ${key} OR LOWER(username) = ${key}
        ORDER BY email = ${trimmed} DESC
        LIMIT 1
      `
      if (result.length === 0) return res.status(401).json({ error: INVALID })

      const user = result[0]
      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) return res.status(401).json({ error: INVALID })

      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.status(200).json({
        user: { id: user.id, email: user.email, username: user.username, firstName: user.first_name, lastName: user.last_name },
        token,
      })
    } catch {
      res.status(500).json({ error: 'Login failed' })
    }
  }
}

export default createHandler()
