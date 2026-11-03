import { Link } from 'react-router-dom'
import type { AiError } from '../services/aiConfig'

const SETTINGS_CODES: AiError['code'][] = ['AI_NOT_CONFIGURED', 'AI_KEY_UNREADABLE', 'AI_PROVIDER_AUTH']

interface Props {
  error: AiError
  onDismiss: () => void
  onNavigate?: () => void
}

export default function AiErrorNotice({ error, onDismiss, onNavigate }: Props) {
  return (
    <div className="ai-error" role="alert">
      <p className="ai-error-text">
        {error.message}
        {SETTINGS_CODES.includes(error.code) && (
          <> <Link to="/settings" onClick={onNavigate}>Open Settings</Link></>
        )}
      </p>
      <button className="ai-error-dismiss" onClick={onDismiss} aria-label="Dismiss error">✕</button>
    </div>
  )
}
