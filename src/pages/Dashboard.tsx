import { Link } from 'react-router-dom'
import HeroHeader from '../components/HeroHeader'
import NotesTimeline from '../components/NotesTimeline'
import FocusToday from '../components/FocusToday'
import WeeklyConsistency from '../components/WeeklyConsistency'
import PracticeExams from '../components/PracticeExams'
import QuizProgressCard from '../components/QuizProgressCard'
import { domains } from '../data/domains'

export default function Dashboard() {
  return (
    <div>
      <HeroHeader />

      <section className="section">
        <NotesTimeline />
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-icon">📊</span>
          <h2>Domain Progress</h2>
        </div>
        <div className="domain-grid">
          {domains.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
        </div>
      </section>

      <section className="section">
        <FocusToday />
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-icon">📈</span>
          <h2>Weekly Consistency</h2>
        </div>
        <WeeklyConsistency />
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-icon">🧪</span>
          <h2>Practice Exams</h2>
        </div>
        <div className="card">
          <PracticeExams />
        </div>
      </section>

      <section className="section">
        <QuizProgressCard />
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-icon">🔗</span>
          <h2>Quick Links</h2>
        </div>
        <div className="quick-links">
          <Link to="/" className="quick-link">📘 Dashboard</Link>
          <Link to="/exam" className="quick-link">📋 Exam Simulation (719 Qs)</Link>
          <Link to="/domain/1" className="quick-link">☁️ Cloud Concepts</Link>
          <Link to="/domain/2" className="quick-link">🔒 Security &amp; Compliance</Link>
          <Link to="/domain/3" className="quick-link">⚙️ Technology &amp; Services</Link>
          <Link to="/domain/4" className="quick-link">💰 Billing, Pricing &amp; Support</Link>
        </div>
      </section>
    </div>
  )
}
