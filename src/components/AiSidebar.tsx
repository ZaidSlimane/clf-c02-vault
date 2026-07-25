import { useState, useRef, useEffect } from 'react'
import { useAiChat } from '../context/AiChat'
import { getAiConfig } from '../services/aiConfig'

export default function AiSidebar() {
  const { sidebarOpen, conversations, chatLoading, toggleSidebar, closeSidebar, clearConversations, askAI } = useAiChat()
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [conversations.length])

  const handleSend = () => {
    const text = input.trim()
    if (!text || chatLoading) return
    setInput('')
    askAI(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasKey = !!getAiConfig().apiKey

  return (
    <>
      {sidebarOpen && <div className="ais-overlay" onClick={closeSidebar} />}

      <aside className={`ais-sidebar ${sidebarOpen ? 'ais-open' : ''}`}>
        <div className="ais-header">
          <div className="ais-header-left">
            <span className="ais-header-icon">🤖</span>
            <h3 className="ais-title">AI Assistant</h3>
          </div>
          <div className="ais-header-actions">
            {conversations.length > 0 && (
              <button className="ais-btn ais-btn-icon" onClick={clearConversations} title="Clear history">
                🗑️
              </button>
            )}
            <button className="ais-btn ais-btn-icon" onClick={closeSidebar} title="Close sidebar">
              ✕
            </button>
          </div>
        </div>

        <div className="ais-body" ref={bodyRef}>
          {conversations.length === 0 ? (
            <div className="ais-empty">
              <div className="ais-empty-icon">💬</div>
              <p className="ais-empty-text">Ask a question or click <strong>"Explain with AI"</strong> on any exam question.</p>
            </div>
          ) : (
            conversations.map(c => (
              <div key={c.id} className="ais-message">
                <div className="ais-message-question">
                  <span className="ais-message-label">Q</span>
                  <p>{c.questionText}</p>
                </div>
                <div className="ais-message-answer">
                  <span className="ais-message-label">A</span>
                  <div className="ais-message-content">{c.answer}</div>
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="ais-message">
              <div className="ais-message-answer">
                <span className="ais-message-label">A</span>
                <div className="ais-message-content ais-thinking">Thinking...</div>
              </div>
            </div>
          )}
        </div>

        <div className="ais-footer">
          <div className="ais-chat-input-row">
            <input
              className="ais-chat-input"
              type="text"
              placeholder={hasKey ? 'Ask anything about AWS...' : 'Set API key first...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
            />
            <button
              className="ais-chat-send"
              onClick={handleSend}
              disabled={!input.trim() || chatLoading}
            >
              Send
            </button>
          </div>
          {!hasKey && (
            <p className="ais-chat-hint">No API key set — click "Explain with AI" on any question to set one.</p>
          )}
        </div>
      </aside>

      <button
        className={`ais-toggle ${sidebarOpen ? 'ais-toggle-shifted' : ''}`}
        onClick={toggleSidebar}
        title="Toggle AI Assistant"
      >
        🤖
      </button>
    </>
  )
}
