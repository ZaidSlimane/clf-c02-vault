import { callProvider, ProviderError } from './_lib/aiProvider.js'
import { getUser } from './_lib/auth.js'
import { decryptApiKey, KeyConfigError } from './_lib/crypto.js'
import sql from './_lib/db.js'

const MAX_PROMPT_LENGTH = 20000

export function createHandler({ sql, decryptApiKey, callProvider }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const user = getUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    let prompt
    try {
      prompt = req.body?.prompt
    } catch {
      return res.status(400).json({ error: 'Invalid request body' })
    }
    if (typeof prompt !== 'string' || prompt.length < 1 || prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Prompt must be 1-${MAX_PROMPT_LENGTH} characters` })
    }

    try {
      const rows = await sql`
        SELECT base_url, model, api_key_encrypted
        FROM user_ai_settings
        WHERE user_id = ${user.userId}
      `
      if (rows.length === 0) {
        return res.status(409).json({ error: 'AI provider is not configured', code: 'AI_NOT_CONFIGURED' })
      }

      let apiKey
      try {
        apiKey = decryptApiKey(rows[0].api_key_encrypted, user.userId)
      } catch (err) {
        if (err instanceof KeyConfigError) throw err
        return res.status(409).json({ error: 'Saved API key cannot be read', code: 'AI_KEY_UNREADABLE' })
      }

      const answer = await callProvider({
        baseUrl: rows[0].base_url,
        model: rows[0].model,
        apiKey,
        prompt,
      })
      return res.status(200).json({ answer })
    } catch (err) {
      if (err instanceof ProviderError) {
        const status = err.code === 'AI_PROVIDER_RATE_LIMIT' ? 429 : 502
        return res.status(status).json({ error: err.message, code: err.code })
      }
      console.error('chat request failed:', err instanceof KeyConfigError ? err.message : err?.name)
      return res.status(500).json({ error: 'AI request failed' })
    }
  }
}

export default createHandler({ sql, decryptApiKey, callProvider })
