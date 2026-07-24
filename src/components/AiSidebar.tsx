import { useAiChat } from '../context/AiChat'

export default function AiSidebar() {
  const { sidebarOpen, conversations, toggleSidebar, closeSidebar, clearConversations } = useAiChat()

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

        <div className="ais-body">
          {conversations.length === 0 ? (
            <div className="ais-empty">
              <div className="ais-empty-icon">💬</div>
              <p className="ais-empty-text">Ask the AI to explain a question and the answer will appear here.</p>
              <p className="ais-empty-hint">Click <strong>"Explain with AI"</strong> on any question.</p>
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
