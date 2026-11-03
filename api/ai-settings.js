import { getUser } from './_lib/auth.js'
import { encryptApiKey, KeyConfigError } from './_lib/crypto.js'
import sql from './_lib/db.js'
import { assertPublicHost, BaseUrlError, normalizeBaseUrl } from './_lib/ssrf.js'

const MAX_MODEL_LENGTH = 200
const MAX_API_KEY_LENGTH = 4096
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

// Sent as an HTTP header value, so anything else could never authenticate.
const VISIBLE_ASCII = /^[\x21-\x7e]+$/

const publicShape = (row) => row
  ? { configured: true, baseUrl: row.base_url, model: row.model }
  : { configured: false, baseUrl: null, model: null }

function validateModel(value) {
  const model = typeof value === 'string' ? value.trim() : ''
  if (!model || model.length > MAX_MODEL_LENGTH || CONTROL_CHARS.test(model)) return null
  return model
}

export function createHandler({ sql, encryptApiKey, assertPublicHost }) {
  const loadRow = async (userId) => {
    const rows = await sql`SELECT base_url, model FROM user_ai_settings WHERE user_id = ${userId}`
    return rows[0] ?? null
  }

  const save = async (req, res, userId) => {
    let body
    try {
      body = req.body
    } catch {
      return res.status(400).json({ error: 'Invalid request body' })
    }
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid request body' })

    const baseUrl = normalizeBaseUrl(body.baseUrl)
    const model = validateModel(body.model)
    if (!model) return res.status(400).json({ error: `Model must be 1-${MAX_MODEL_LENGTH} characters` })

    const { apiKey } = body
    const hasKey = apiKey !== undefined && apiKey !== null && apiKey !== ''
    if (hasKey && (typeof apiKey !== 'string' || apiKey.length > MAX_API_KEY_LENGTH || !VISIBLE_ASCII.test(apiKey))) {
      return res.status(400).json({ error: 'API key is not valid' })
    }

    await assertPublicHost(new URL(baseUrl).hostname)

    const existing = await loadRow(userId)
    if (!hasKey) {
      if (!existing) return res.status(400).json({ error: 'API key is required' })
      // A saved key must never follow a change of host.
      if (new URL(existing.base_url).origin !== new URL(baseUrl).origin) {
        return res.status(400).json({ error: 'Enter the API key again when changing the provider host' })
      }
      // Matching the checked base_url keeps the origin check and the write atomic.
      const updated = await sql`
        UPDATE user_ai_settings
        SET base_url = ${baseUrl}, model = ${model}, updated_at = NOW()
        WHERE user_id = ${userId} AND base_url = ${existing.base_url}
        RETURNING user_id
      `
      if (updated.length === 0) {
        return res.status(409).json({ error: 'Your AI settings changed. Reload the page and try again.' })
      }
    } else {
      const encrypted = encryptApiKey(apiKey, userId)
      await sql`
        INSERT INTO user_ai_settings (user_id, base_url, model, api_key_encrypted, updated_at)
        VALUES (${userId}, ${baseUrl}, ${model}, ${encrypted}, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          base_url = EXCLUDED.base_url,
          model = EXCLUDED.model,
          api_key_encrypted = EXCLUDED.api_key_encrypted,
          updated_at = NOW()
      `
    }
    return res.status(200).json(publicShape({ base_url: baseUrl, model }))
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')

    const user = getUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    try {
      if (req.method === 'GET') return res.status(200).json(publicShape(await loadRow(user.userId)))
      if (req.method === 'PUT') return await save(req, res, user.userId)
      if (req.method === 'DELETE') {
        await sql`DELETE FROM user_ai_settings WHERE user_id = ${user.userId}`
        return res.status(204).end()
      }
      return res.status(405).json({ error: 'Method not allowed' })
    } catch (err) {
      if (err instanceof BaseUrlError) return res.status(400).json({ error: err.message })
      console.error('ai-settings request failed:', err instanceof KeyConfigError ? err.message : err?.name)
      return res.status(500).json({ error: 'Failed to process AI settings' })
    }
  }
}

export default createHandler({ sql, encryptApiKey, assertPublicHost })
