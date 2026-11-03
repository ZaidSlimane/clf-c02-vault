import HeroHeader from '../components/HeroHeader'
import NotesTimeline from '../components/NotesTimeline'
import DomainCard from '../components/DomainCard'
import DomainReadiness from '../components/DomainReadiness'
import FocusToday from '../components/FocusToday'
import WeeklyConsistency from '../components/WeeklyConsistency'
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
            <div className="vault-section__heading"><h2>Exam domains</h2></div>
            <DomainReadiness />
            <div className="domain-grid">
              {domains.map((d) => <DomainCard key={d.id} domain={d} />)}
            </div>
          </section>
          <section className="vault-section vault-section--focus"><FocusToday /></section>
        </div>
        <aside className="vault-overview__side">
          <section className="vault-section vault-section--notes"><NotesTimeline /></section>
          <section className="vault-section vault-section--consistency"><span className="vault-eyebrow">This week</span><WeeklyConsistency /></section>
        </aside>
      </div>
    </div>
  )
}
