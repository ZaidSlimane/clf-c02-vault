import { useState } from 'react'
import { getAiConfig, setAiConfig, clearAiConfig } from '../services/aiConfig'

export default function SettingsPage() {
  const existing = getAiConfig()
  const [baseUrl, setBaseUrl] = useState(existing.baseUrl)
  const [model, setModel] = useState(existing.model)
  const [apiKey, setApiKey] = useState(existing.apiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setAiConfig({ baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearAiConfig()
    setApiKey('')
    setBaseUrl('https://inference.dahl.global/v1')
    setModel('moonshotai/Kimi-K2.6')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasKey = apiKey.trim().length > 0

  return (
    <div className="settings-page">
      <h1>⚙️ Settings</h1>

      <section className="settings-section">
        <h2 className="settings-section-title">AI Integration</h2>
        <p className="settings-desc">
          Configure your preferred AI provider. Any OpenAI-compatible API works — set the base URL, model name, and your API key.
        </p>

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-base-url">Base URL</label>
          <input
            id="ai-base-url"
            type="text"
            className="settings-input"
            value={baseUrl}
            onChange={e => { setBaseUrl(e.target.value); setSaved(false) }}
            placeholder="https://inference.dahl.global/v1"
          />
          <p className="settings-hint">The API endpoint root, e.g. <code>https://api.openai.com/v1</code></p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-model">Model</label>
          <input
            id="ai-model"
            type="text"
            className="settings-input"
            value={model}
            onChange={e => { setModel(e.target.value); setSaved(false) }}
            placeholder="moonshotai/Kimi-K2.6"
          />
          <p className="settings-hint">Model identifier, e.g. <code>gpt-4o</code> or <code>moonshotai/Kimi-K2.6</code></p>
        </div>

        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-api-key">API Key</label>
          <input
            id="ai-api-key"
            type="password"
            className="settings-input"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setSaved(false) }}
            placeholder="sk-..."
          />
          <p className="settings-hint">Stored locally in your browser, never sent to our server</p>
        </div>

        <div className="settings-actions">
          <button className="settings-btn settings-btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
          {hasKey && (
            <button className="settings-btn settings-btn-danger" onClick={handleClear}>
              Reset to Defaults
            </button>
          )}
        </div>

        {hasKey && (
          <div className="settings-status settings-status-active">
            <span className="settings-status-dot" />
            AI assistant configured — using {model} at {baseUrl}
          </div>
        )}
      </section>
    </div>
  )
}
