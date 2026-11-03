import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAiChat, type Conversation } from '../context/AiChat'
import AiErrorNotice from './AiErrorNotice'

const MAX_QUESTION_LENGTH = 19000
const SUGGESTIONS = [
  'Explain the shared responsibility model',
  'When do I pick S3 Glacier over S3 Standard?',
  'Compare Reserved and Spot Instances',
]

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12Z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close: 'M6 6l12 12M18 6 6 18',
  send: 'M12 19V5M6 11l6-6 6 6',
}

/** Reveals a fresh answer word by word; `onProgress` keeps the view pinned to the bottom. */
function TypedAnswer({ text, onProgress }: { text: string; onProgress: () => void }) {
  const [shown, setShown] = useState(0)
  const words = text.split(/(\s+)/)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(words.length)
      return
    }
    const step = Math.max(1, Math.ceil(words.length / 160))
    const timer = setInterval(() => {
      setShown(current => {
        if (current >= words.length) clearInterval(timer)
        return Math.min(current + step, words.length)
      })
    }, 24)
    return () => clearInterval(timer)
  }, [text, words.length])

  useEffect(onProgress, [shown, onProgress])

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{words.slice(0, shown).join('')}</span>
    </>
  )
}

export default function AiSidebar() {
  const {
    sidebarOpen, conversations, chatLoading, aiStatus, aiError,
    toggleSidebar, closeSidebar, clearConversations, askAI, dismissAiError,
  } = useAiChat()
  const [input, setInput] = useState('')
  const [typingId, setTypingId] = useState<Conversation['id'] | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const wasLoading = useRef(false)

  const scrollToEnd = useRef(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }).current

  useEffect(scrollToEnd, [conversations.length, chatLoading, scrollToEnd])

  useEffect(() => {
    if (wasLoading.current && !chatLoading && conversations.length > 0) {
      setTypingId(conversations[conversations.length - 1].id)
    }
    wasLoading.current = chatLoading
  }, [chatLoading, conversations])

  const send = (text: string) => {
    if (!text || chatLoading) return
    setInput('')
    askAI(text).then(ok => {
      if (!ok) setInput(current => current || text)
    })
  }

  const handleSend = () => send(input.trim())

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {sidebarOpen && <div className="ais-overlay" onClick={closeSidebar} />}

      <aside className={`ais-sidebar ${sidebarOpen ? 'ais-open' : ''}`}>
        <div className="ais-header">
          <h3 className="ais-title">AI assistant</h3>
          <div className="ais-header-actions">
            {conversations.length > 0 && (
              <button className="ais-btn ais-btn-icon" onClick={clearConversations} title="Clear history" aria-label="Clear history">
                <Icon path={ICONS.trash} />
              </button>
            )}
            <button className="ais-btn ais-btn-icon" onClick={closeSidebar} title="Close sidebar" aria-label="Close sidebar">
              <Icon path={ICONS.close} />
            </button>
          </div>
        </div>

        <div className="ais-body" ref={bodyRef} role="log" aria-live="polite">
          {conversations.length === 0 && !chatLoading ? (
            <div className="ais-empty">
              <p className="ais-empty-title">Ask about any CLF-C02 topic</p>
              <div className="ais-suggestions">
                {SUGGESTIONS.map((text, i) => (
                  <button
                    key={text}
                    type="button"
                    className="ais-suggestion"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => send(text)}
                    disabled={aiStatus === 'unconfigured'}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversations.map(c => (
              <div key={c.id} className="ais-message">
                <div className="ais-bubble ais-bubble-question">{c.questionText}</div>
                <div className="ais-bubble ais-bubble-answer ais-message-content">
                  {c.id === typingId ? <TypedAnswer text={c.answer} onProgress={scrollToEnd} /> : c.answer}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="ais-message">
              <div className="ais-bubble ais-bubble-answer ais-typing" role="status" aria-label="Thinking">
                <i /><i /><i />
              </div>
            </div>
          )}
        </div>

        <div className="ais-footer">
          {aiError && <AiErrorNotice error={aiError} onDismiss={dismissAiError} onNavigate={closeSidebar} />}
          <div className="ais-chat-input-row">
            <input
              className="ais-chat-input"
              type="text"
              aria-label="Ask the AI assistant"
              placeholder={aiStatus === 'unconfigured' ? 'Set up AI in Settings first' : 'Ask about AWS'}
              maxLength={MAX_QUESTION_LENGTH}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
            />
            <button
              className="ais-chat-send"
              onClick={handleSend}
              disabled={!input.trim() || chatLoading}
              aria-label="Send"
            >
              <Icon path={ICONS.send} />
            </button>
          </div>
          {aiStatus === 'unconfigured' && (
            <p className="ais-chat-hint">
              No AI provider set up yet. <Link to="/settings" onClick={closeSidebar}>Add one in Settings</Link>.
            </p>
          )}
          {aiStatus === 'error' && (
            <p className="ais-chat-hint">Could not check your AI setup. You can still try sending a question.</p>
          )}
        </div>
      </aside>

      <button
        className={`ais-toggle ${sidebarOpen ? 'ais-toggle-shifted' : ''}`}
        onClick={toggleSidebar}
        title="Toggle AI assistant"
        aria-label="Toggle AI assistant"
      >
        <Icon path={ICONS.chat} />
      </button>
    </>
  )
}
