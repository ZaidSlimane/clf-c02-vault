import { useCallback, useEffect, useRef, useState } from 'react'
import { useAiChat } from '../context/AiChat'
import { SUGGESTED_AI_PROVIDER } from '../services/aiConfig'
import { deleteAiSettings, getAiSettings, saveAiSettings, type AiSettings } from '../services/api'

type LoadState = 'loading' | 'ready' | 'failed'

const ERROR_ID = 'ai-settings-error'

export default function SettingsPage() {
  const { refreshAiStatus } = useAiChat()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [current, setCurrent] = useState<AiSettings | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mounted = useRef(true)
  const inFlight = useRef(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const settings = await getAiSettings()
      if (!mounted.current) return
      setCurrent(settings)
      setBaseUrl(settings.baseUrl ?? SUGGESTED_AI_PROVIDER.baseUrl)
      setModel(settings.model ?? SUGGESTED_AI_PROVIDER.model)
      setLoadState('ready')
    } catch {
      if (mounted.current) setLoadState('failed')
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
      clearTimeout(savedTimer.current)
    }
  }, [load])

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const handleSave = () => run(async () => {
    const key = apiKey.trim()
    const settings = await saveAiSettings({
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      ...(key ? { apiKey: key } : {}),
    })
    await refreshAiStatus()
    if (!mounted.current) return
    setCurrent(settings)
    setBaseUrl(settings.baseUrl ?? '')
    setModel(settings.model ?? '')
    setApiKey('')
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  })

  const handleRemove = () => {
    if (!window.confirm('Remove your AI provider and saved API key?')) return
    run(async () => {
      await deleteAiSettings()
      await refreshAiStatus()
      if (!mounted.current) return
      setCurrent({ configured: false, baseUrl: null, model: null })
      setBaseUrl(SUGGESTED_AI_PROVIDER.baseUrl)
      setModel(SUGGESTED_AI_PROVIDER.model)
      setApiKey('')
      setSaved(false)
    })
  }

  const resetFeedback = () => {
    setSaved(false)
    setError(null)
  }

  const describedBy = (hintId: string) => (error ? `${hintId} ${ERROR_ID}` : hintId)
  const disabled = loadState !== 'ready' || busy
  const configured = current?.configured === true

  return (
    <div className="settings-page">
      <h1>⚙️ Settings</h1>

      <section className="settings-section">
        <h2 className="settings-section-title">AI Integration</h2>
        <p className="settings-desc">
          Configure your preferred AI provider. Any OpenAI-compatible API reachable over public HTTPS works — set the base URL, model name, and your API key.
        </p>

        {loadState === 'loading' && <p className="settings-loading">Loading your AI settings...</p>}
        {loadState === 'failed' && (
          <div className="settings-error" role="alert">
            <p>Could not load your AI settings.</p>
            <button className="settings-btn settings-btn-primary" onClick={load}>Retry</button>
          </div>
        )}

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-base-url">Base URL</label>
          <input
            id="ai-base-url"
            type="text"
            className="settings-input"
            value={baseUrl}
            onChange={e => { setBaseUrl(e.target.value); resetFeedback() }}
            placeholder={SUGGESTED_AI_PROVIDER.baseUrl}
            disabled={disabled}
            aria-describedby={describedBy('ai-base-url-hint')}
          />
          <p className="settings-hint" id="ai-base-url-hint">The API endpoint root, e.g. <code>https://api.openai.com/v1</code></p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-model">Model</label>
          <input
            id="ai-model"
            type="text"
            className="settings-input"
            value={model}
            onChange={e => { setModel(e.target.value); resetFeedback() }}
            placeholder={SUGGESTED_AI_PROVIDER.model}
            disabled={disabled}
            aria-describedby={describedBy('ai-model-hint')}
          />
          <p className="settings-hint" id="ai-model-hint">Model identifier, e.g. <code>gpt-4o</code> or <code>moonshotai/Kimi-K2.6</code></p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-api-key">API Key</label>
          <input
            id="ai-api-key"
            type="password"
            autoComplete="new-password"
            className="settings-input"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); resetFeedback() }}
            placeholder={configured ? 'Key saved. Leave blank to keep it' : 'sk-...'}
            disabled={disabled}
            aria-describedby={describedBy('ai-api-key-hint')}
          />
          <p className="settings-hint" id="ai-api-key-hint">Your key is sent to our server, stored encrypted, and used only for your AI requests.</p>
        </div>

        {error && <div className="settings-error" id={ERROR_ID} role="alert"><p>{error}</p></div>}

        <div className="settings-actions">
          <button className="settings-btn settings-btn-primary" onClick={handleSave} disabled={disabled}>
            {busy ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
          {configured && (
            <button className="settings-btn settings-btn-danger" onClick={handleRemove} disabled={disabled}>
              Remove AI Provider
            </button>
          )}
        </div>

        {configured && (
          <div className="settings-status settings-status-active">
            <span className="settings-status-dot" />
            AI assistant configured — using {current?.model} at {current?.baseUrl}
          </div>
        )}
      </section>
    </div>
  )
}
