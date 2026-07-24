import https from 'https'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.DAHL_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on Vercel. Set DAHL_API_KEY env var.' })

  const { prompt } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })

  const body = JSON.stringify({
    model: 'moonshotai/Kimi-K2.6',
    messages: [{ role: 'user', content: prompt }],
  })

  try {
    const data = await new Promise((resolve, reject) => {
      const url = new URL('https://inference.dahl.global/v1/chat/completions')
      const opts = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }
      const request = https.request(opts, (response) => {
        let chunks = ''
        response.on('data', (chunk) => chunks += chunk)
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(chunks) })
          } catch {
            resolve({ status: response.statusCode, body: { raw: chunks.slice(0, 500) } })
          }
        })
      })
      request.on('error', reject)
      request.write(body)
      request.end()
    })

    if (data.status !== 200) {
      return res.status(data.status).json({ error: data.body?.error?.message || JSON.stringify(data.body) })
    }
    res.status(200).json(data.body)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Request failed' })
  }
}
