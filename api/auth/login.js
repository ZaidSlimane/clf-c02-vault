import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import defaultSql from '../_lib/db.js'

export function createHandler({ sql = defaultSql } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    try {
      const result = await sql`SELECT * FROM users WHERE email = ${email}`
      if (result.length === 0) return res.status(401).json({ error: 'Invalid email or password' })

      const user = result[0]
      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.status(200).json({ user: { id: user.id, email: user.email }, token })
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' })
    }
  }
}

export default createHandler()
