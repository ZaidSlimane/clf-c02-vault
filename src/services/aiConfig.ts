export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const CONFIG_KEY = 'clf-c02-ai-config'
const OLD_KEY_KEY = 'dahl_api_key'

const DEFAULTS: AiConfig = {
  apiKey: '',
  baseUrl: 'https://inference.dahl.global/v1',
  model: 'moonshotai/Kimi-K2.6',
}

export function getAiConfig(): AiConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULTS, ...parsed }
    }
  } catch {}
  const oldKey = localStorage.getItem(OLD_KEY_KEY) || ''
  return { ...DEFAULTS, apiKey: oldKey }
}

export function setAiConfig(config: Partial<AiConfig>): void {
  const current = getAiConfig()
  const next = { ...current, ...config }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
  if (config.apiKey) localStorage.setItem(OLD_KEY_KEY, config.apiKey)
}

export function clearAiConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
  localStorage.removeItem(OLD_KEY_KEY)
}

export async function callAiAPI(
  prompt: string,
  onError?: (msg: string) => void,
): Promise<string | null> {
  const config = getAiConfig()
  let key = config.apiKey

  if (!key) {
    const entered = window.prompt('Enter your AI API key:')
    if (!entered) return null
    key = entered
    setAiConfig({ apiKey: key })
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = `API Error (${res.status}): ${data.error?.message || JSON.stringify(data).slice(0, 300)}`
      onError?.(msg)
      return msg
    }
    const answer = data.choices?.[0]?.message?.content || 'No response from AI'
    return answer
  } catch (err) {
    const msg = `Network error: ${err instanceof Error ? err.message : 'Unknown'}`
    onError?.(msg)
    return msg
  }
}
