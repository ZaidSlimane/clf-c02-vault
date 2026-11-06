import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Weights are the published CLF-C02 exam weightings; readiness is sample data.
const PREVIEW_DOMAINS = [
  { name: 'Cloud Concepts', weight: 24, readiness: 86 },
  { name: 'Security & Compliance', weight: 30, readiness: 72 },
  { name: 'Cloud Technology & Services', weight: 34, readiness: 58 },
  { name: 'Billing, Pricing & Support', weight: 12, readiness: 91 },
]

const TOOLS = [
  { name: 'Notes', text: 'Study notes for all four exam domains, with topics you check off as you learn them' },
  { name: 'Practice exams', text: '719 questions with saved progress, so you can see what you keep getting wrong' },
  { name: 'Lecture tracker', text: 'Mark lectures as done and log study sessions to keep a steady pace' },
  { name: 'AI explanations', text: 'Ask why an answer is right, using your own AI provider and key' },
]

export default function LandingPage() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/welcome" className="wordmark">CLF Vault</Link>
        <nav className="landing-nav-actions">
          <Link to="/signin" className="landing-link">Sign in</Link>
          <Link to="/signin?mode=signup" className="landing-btn landing-btn-small">Create account</Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-text">
            <p className="exam-meta">AWS Certified Cloud Practitioner · CLF-C02</p>
            <h1>Know what to study before your CLF-C02 exam</h1>
            <p className="landing-sub">
              Notes, practice exams and a lecture tracker in one place, with readiness measured against each exam domain
            </p>
            <Link to="/signin?mode=signup" className="landing-btn">Start studying</Link>
          </div>

          <figure className="landing-preview" aria-label="Sample readiness view of the four exam domains">
            <div className="landing-preview-head">
              <span>Exam readiness</span>
              <span className="exam-meta">23 days left</span>
            </div>
            <ul>
              {PREVIEW_DOMAINS.map((domain, index) => (
                <li key={domain.name}>
                  <div className="landing-preview-row">
                    <span>{domain.name}</span>
                    <span className="exam-meta">{domain.readiness}%</span>
                  </div>
                  <div className="landing-bar">
                    <span className={domain.readiness < 60 ? 'is-focus' : ''} style={{ width: `${domain.readiness}%` }} />
                  </div>
                  <p className="exam-meta">Domain {index + 1} · {domain.weight}% of exam</p>
                </li>
              ))}
            </ul>
            <figcaption className="exam-meta">Sample data</figcaption>
          </figure>
        </section>

        <section className="landing-tools" aria-label="What is included">
          {TOOLS.map(tool => (
            <div key={tool.name}>
              <h2>{tool.name}</h2>
              <p>{tool.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="landing-footer exam-meta">CLF Vault · CLF-C02 study system</footer>
    </div>
  )
}
