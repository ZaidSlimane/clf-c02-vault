import jwt from 'jsonwebtoken'

export const JWT_SECRET = 'test-jwt-secret'

// Importing a handler builds the Neon client, which needs a URL but no connection.
export function setTestEnv() {
  process.env.JWT_SECRET = JWT_SECRET
  process.env.DATABASE_URL = 'postgresql://user:pass@db.invalid/test'
}

export const bearer = (userId) => `Bearer ${jwt.sign({ userId, email: `u${userId}@example.com` }, JWT_SECRET)}`

export function mockRes() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    end() { return this },
  }
}

// In-memory stand-in for the users table, assigning incrementing ids.
export function fakeUsersSql(rows = []) {
  const sql = async (strings, ...values) => {
    const text = strings.join('?')
    if (text.includes('SELECT')) {
      const [emailKey, usernameKey] = values
      return rows.filter((row) => row.email.toLowerCase() === emailKey || row.username?.toLowerCase() === usernameKey)
    }
    if (text.includes('INSERT')) {
      const [email, username, first_name, last_name, password_hash] = values
      const row = { id: rows.length + 1, email, username, first_name, last_name, password_hash, created_at: new Date() }
      rows.push(row)
      return [row]
    }
    throw new Error(`Unexpected query: ${text}`)
  }
  return { sql, rows }
}

// In-memory stand-in for the user_ai_settings table, driven by the SQL verb.
export function fakeAiSettingsSql(rows = new Map()) {
  const calls = []
  const sql = async (strings, ...values) => {
    const text = strings.join('?')
    calls.push({ text, values })
    if (text.includes('SELECT')) {
      const row = rows.get(values[0])
      return row ? [row] : []
    }
    if (text.includes('INSERT')) {
      const [userId, base_url, model, api_key_encrypted] = values
      rows.set(userId, { base_url, model, api_key_encrypted })
      return []
    }
    if (text.includes('UPDATE')) {
      const [base_url, model, userId, expectedBaseUrl] = values
      const row = rows.get(userId)
      if (!row || row.base_url !== expectedBaseUrl) return []
      rows.set(userId, { ...row, base_url, model })
      return [{ user_id: userId }]
    }
    if (text.includes('DELETE')) {
      rows.delete(values[0])
      return []
    }
    throw new Error(`Unexpected query: ${text}`)
  }
  return { sql, rows, calls }
}
