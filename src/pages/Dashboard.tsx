import { Link } from 'react-router-dom'
import HeroHeader from '../components/HeroHeader'
import NotesTimeline from '../components/NotesTimeline'
import DomainCard from '../components/DomainCard'
import FocusToday from '../components/FocusToday'
import WeeklyConsistency from '../components/WeeklyConsistency'
import PracticeExams from '../components/PracticeExams'
import QuizProgressCard from '../components/QuizProgressCard'
import { domains } from '../data/domains'

export default function Dashboard() {
  return (
    <div className="vault-overview">
      <HeroHeader />
      <section className="vault-overview__progress">
        <QuizProgressCard />
      </section>
      <div className="vault-overview__layout">
        <div className="vault-overview__primary">
          <section className="vault-section vault-section--domains">
            <div className="vault-section__heading"><span className="vault-eyebrow">DOMAIN SIGNAL</span><h2>Read the map, then choose your route.</h2></div>
            <div className="domain-grid">
              {domains.map((d) => <DomainCard key={d.id} domain={d} />)}
            </div>
          </section>
          <section className="vault-section vault-section--focus"><FocusToday /></section>
          <section className="vault-section vault-section--practice">
            <div className="vault-section__heading"><span className="vault-eyebrow">PRACTICE LOG</span><h2>Turn completed runs into the next right review.</h2></div>
            <div className="card"><PracticeExams /></div>
          </section>
        </div>
        <aside className="vault-overview__side">
          <section className="vault-section vault-section--notes"><NotesTimeline /></section>
          <section className="vault-section vault-section--consistency"><span className="vault-eyebrow">CADENCE</span><WeeklyConsistency /></section>
          <section className="vault-quick-route">
            <span className="vault-eyebrow">QUICK ROUTE</span>
            <Link to="/domain/1">Study Cloud Concepts <span>→</span></Link>
            <Link to="/domain/2">Review security notes <span>→</span></Link>
            <Link to="/exam">Open practice mode <span>→</span></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
