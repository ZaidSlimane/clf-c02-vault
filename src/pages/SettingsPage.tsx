import { useState } from 'react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('dahl_api_key') || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const trimmed = apiKey.trim()
    if (trimmed) {
      localStorage.setItem('dahl_api_key', trimmed)
    } else {
      localStorage.removeItem('dahl_api_key')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    localStorage.removeItem('dahl_api_key')
    setApiKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-page">
      <h1>⚙️ Settings</h1>

      <section className="settings-section">
        <h2 className="settings-section-title">AI Integration</h2>
        <p className="settings-desc">
          The AI assistant uses the Dahl API (Kimi-K2.6) to answer questions and explain concepts.
          Your key is stored locally in your browser and never sent to our server.
        </p>

        <div className="settings-field">
          <label className="settings-label" htmlFor="api-key">Dahl API Key</label>
          <div className="settings-input-row">
            <input
              id="api-key"
              type="password"
              className="settings-input"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setSaved(false) }}
              placeholder="sk-..."
            />
          </div>
          <p className="settings-hint">
            Get your key at <a href="https://dahl.global" target="_blank" rel="noopener noreferrer">dahl.global</a>
          </p>
        </div>

        <div className="settings-actions">
          <button className="settings-btn settings-btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Key'}
          </button>
          {apiKey && (
            <button className="settings-btn settings-btn-danger" onClick={handleClear}>
              Remove Key
            </button>
          )}
        </div>

        {apiKey && (
          <div className="settings-status settings-status-active">
            <span className="settings-status-dot" />
            AI assistant is configured and ready
          </div>
        )}
      </section>
    </div>
  )
}
