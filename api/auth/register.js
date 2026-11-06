import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import defaultSql from '../_lib/db.js'
import { parseRegistration } from '../_lib/validation.js'

const UNIQUE_VIOLATION = '23505'
const USERNAME_INDEX = 'users_username_lower_idx'

export function createHandler({ sql = defaultSql } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { error, values } = parseRegistration(req.body)
    if (error) return res.status(400).json({ error })
    const { firstName, lastName, username, email, password } = values
    const usernameKey = username.toLowerCase()

    try {
      const existing = await sql`
        SELECT email, username FROM users
        WHERE LOWER(email) = ${email} OR LOWER(username) = ${usernameKey}
      `
      if (existing.some(row => row.email.toLowerCase() === email)) {
        return res.status(409).json({ error: 'Email already registered' })
      }
      if (existing.length > 0) return res.status(409).json({ error: 'Username already taken' })

      const passwordHash = await bcrypt.hash(password, 12)
      const result = await sql`
        INSERT INTO users (email, username, first_name, last_name, password_hash)
        VALUES (${email}, ${username}, ${firstName}, ${lastName}, ${passwordHash})
        RETURNING id, email, username, first_name, last_name
      `
      const user = result[0]
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.status(201).json({
        user: { id: user.id, email: user.email, username: user.username, firstName: user.first_name, lastName: user.last_name },
        token,
      })
    } catch (err) {
      // Two sign ups can pass the check above together; the database settles it.
      if (err?.code === UNIQUE_VIOLATION) {
        const taken = err.constraint === USERNAME_INDEX ? 'Username already taken' : 'Email already registered'
        return res.status(409).json({ error: taken })
      }
      res.status(500).json({ error: 'Registration failed' })
    }
  }
}

export default createHandler()
