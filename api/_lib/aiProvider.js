import https from 'node:https'
import { createValidatingLookup, normalizeBaseUrl } from './ssrf.js'

const DEADLINE_MS = 25_000
const MAX_RESPONSE_BYTES = 1024 * 1024

const MESSAGES = {
  AI_PROVIDER_AUTH: 'The AI provider rejected the API key',
  AI_PROVIDER_RATE_LIMIT: 'The AI provider is rate limiting requests',
  AI_PROVIDER_ERROR: 'The AI provider is unavailable',
}

export class ProviderError extends Error {
  constructor(code) {
    super(MESSAGES[code])
    this.name = 'ProviderError'
    this.code = code
  }
}

function codeForStatus(status) {
  if (status === 401 || status === 403) return 'AI_PROVIDER_AUTH'
  if (status === 429) return 'AI_PROVIDER_RATE_LIMIT'
  return 'AI_PROVIDER_ERROR'
}

function parseAnswer(raw) {
  let content
  try {
    content = JSON.parse(raw)?.choices?.[0]?.message?.content
  } catch {
    throw new ProviderError('AI_PROVIDER_ERROR')
  }
  if (typeof content !== 'string' || !content) throw new ProviderError('AI_PROVIDER_ERROR')
  return content
}

export async function callProvider({ baseUrl, model, apiKey, prompt }, {
  request = https.request,
  lookup = createValidatingLookup(),
  deadlineMs = DEADLINE_MS,
  maxResponseBytes = MAX_RESPONSE_BYTES,
} = {}) {
  let url
  try {
    url = new URL(`${normalizeBaseUrl(baseUrl)}/chat/completions`)
  } catch {
    throw new ProviderError('AI_PROVIDER_ERROR')
  }

  const body = JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })

  return new Promise((resolve, reject) => {
    let req
    let settled = false
    let timer

    const finish = (settle, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      settle(value)
      req?.destroy()
    }
    const fail = (code = 'AI_PROVIDER_ERROR') => finish(reject, new ProviderError(code))

    timer = setTimeout(() => fail(), deadlineMs)

    try {
      req = request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        // A fresh connection per call, so the lookup always runs.
        agent: false,
        lookup,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
          'User-Agent': 'clf-vault',
        },
      }, (response) => {
        const status = response.statusCode
        if (status < 200 || status >= 300) return fail(codeForStatus(status))

        const chunks = []
        let size = 0
        response.on('data', (chunk) => {
          size += chunk.length
          if (size > maxResponseBytes) return fail()
          chunks.push(chunk)
        })
        response.on('end', () => {
          try {
            finish(resolve, parseAnswer(Buffer.concat(chunks).toString('utf8')))
          } catch {
            fail()
          }
        })
        response.on('error', () => fail())
        response.on('close', () => fail())
      })
      req.on('error', () => fail())
      req.write(body)
      req.end()
    } catch {
      fail()
    }
  })
}
