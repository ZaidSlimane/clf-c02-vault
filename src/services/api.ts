import { TOKEN_KEY } from './userStorage.ts'

const getToken = () => localStorage.getItem(TOKEN_KEY)

export const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export interface FullProgress {
  answers: Record<string, string[]>
  flags: Record<string, boolean>
  notes: Record<string, string>
  tags: Record<string, string>
  noteTimestamps: Record<string, number>
}

export interface Conversation {
  id: number
  question_text: string
  answer: string
  created_at: string
}

export async function fetchProgress(): Promise<FullProgress> {
  const res = await fetch('/api/progress', { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch progress')
  return res.json()
}

export async function saveFullProgress(data: FullProgress): Promise<void> {
  const res = await fetch('/api/progress', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save progress')
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations', { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch conversations')
  return res.json()
}

export async function saveConversation(questionText: string, answer: string): Promise<Conversation> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ question_text: questionText, answer }),
  })
  if (!res.ok) throw new Error('Failed to save conversation')
  return res.json()
}

export async function clearConversations(): Promise<void> {
  const res = await fetch('/api/conversations', {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error('Failed to clear conversations')
}

export interface AiSettings {
  configured: boolean
  baseUrl: string | null
  model: string | null
}

export interface AiSettingsInput {
  baseUrl: string
  model: string
  apiKey?: string
}

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Sign out and sign in again.'

async function aiSettingsFetch(init?: RequestInit): Promise<Response> {
  try {
    return await fetch('/api/ai-settings', { ...init, headers: headers() })
  } catch {
    throw new Error('Could not reach the server. Try again.')
  }
}

async function aiSettingsError(res: Response, fallback: string): Promise<Error> {
  if (res.status === 401) return new Error(SESSION_EXPIRED_MESSAGE)
  const data = await res.json().catch(() => null)
  return new Error(typeof data?.error === 'string' ? data.error : fallback)
}

export async function getAiSettings(): Promise<AiSettings> {
  const res = await aiSettingsFetch()
  if (!res.ok) throw await aiSettingsError(res, 'Failed to load AI settings')
  return res.json()
}

export async function saveAiSettings(input: AiSettingsInput): Promise<AiSettings> {
  const res = await aiSettingsFetch({ method: 'PUT', body: JSON.stringify(input) })
  if (!res.ok) throw await aiSettingsError(res, 'Failed to save AI settings')
  return res.json()
}

export async function deleteAiSettings(): Promise<void> {
  const res = await aiSettingsFetch({ method: 'DELETE' })
  if (!res.ok) throw await aiSettingsError(res, 'Failed to remove AI settings')
}
