import { headers, SESSION_EXPIRED_MESSAGE } from './api'

export const SUGGESTED_AI_PROVIDER = {
  baseUrl: 'https://inference.dahl.global/v1',
  model: 'moonshotai/Kimi-K2.6',
}

export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_KEY_UNREADABLE'
  | 'AI_SESSION_EXPIRED'
  | 'AI_PROVIDER_AUTH'
  | 'AI_PROVIDER_RATE_LIMIT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_REQUEST_INVALID'
  | 'AI_UNAVAILABLE'

export interface AiError {
  code: AiErrorCode
  message: string
}

export type AiResult = ({ ok: true; answer: string }) | ({ ok: false } & AiError)

const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: 'AI is not set up yet. Add your provider in Settings.',
  AI_KEY_UNREADABLE: 'Your saved API key can no longer be read. Enter it again in Settings.',
  AI_SESSION_EXPIRED: SESSION_EXPIRED_MESSAGE,
  AI_PROVIDER_AUTH: 'Your AI provider rejected the API key. Check it in Settings.',
  AI_PROVIDER_RATE_LIMIT: 'Your AI provider is rate limiting requests. Wait a moment and try again.',
  AI_PROVIDER_ERROR: 'Your AI provider is unavailable or timed out. Try again shortly.',
  AI_REQUEST_INVALID: 'That request is too long or empty. Shorten it and try again.',
  AI_UNAVAILABLE: 'The AI service could not be reached. Try again shortly.',
}

const failure = (code: AiErrorCode): AiResult => ({ ok: false, code, message: AI_ERROR_MESSAGES[code] })

function errorCodeFor(status: number, code: unknown): AiErrorCode {
  if (status === 401) return 'AI_SESSION_EXPIRED'
  if (status === 400) return 'AI_REQUEST_INVALID'
  if (typeof code === 'string' && code in AI_ERROR_MESSAGES) return code as AiErrorCode
  return 'AI_UNAVAILABLE'
}

export function purgeLegacyAiStorage(): void {
  try {
    localStorage.removeItem('clf-c02-ai-config')
    localStorage.removeItem('dahl_api_key')
  } catch {}
}

export async function callAiAPI(prompt: string): Promise<AiResult> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && typeof data?.answer === 'string' && data.answer) {
      return { ok: true, answer: data.answer }
    }
    return failure(errorCodeFor(res.status, data?.code))
  } catch {
    return failure('AI_UNAVAILABLE')
  }
}
