const getToken = () => localStorage.getItem('clf-c02-auth-token')

const headers = () => {
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
