import { Link } from 'react-router-dom'
import { daysUntilExam, formatExamDate, useExamDate } from '../services/examDate'

function ExamCountdown() {
  const examDate = useExamDate()
  if (!examDate) {
    return (
      <>
        <strong>No date set</strong>
        <Link to="/settings">Set exam date</Link>
      </>
    )
  }

  const days = daysUntilExam(examDate)
  if (days < 0) {
    return (
      <>
        <strong>Exam date passed</strong>
        <Link to="/settings">Update exam date</Link>
      </>
    )
  }

  return (
    <>
      <strong>{days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`}</strong>
      <span>{days === 0 ? formatExamDate(examDate) : `until ${formatExamDate(examDate)}`}</span>
    </>
  )
}

export default function HeroHeader() {
  return (
    <section className="vault-hero">
      <div className="vault-hero__copy">
        <h1>CLF-C02 study desk</h1>
        <p>Your notes, course tracker and exam practice for AWS Certified Cloud Practitioner</p>
        <div className="vault-hero__actions">
          <Link to="/exam" className="vault-button vault-button--primary">Resume practice</Link>
          <Link to="/tracker" className="vault-button vault-button--quiet">Open course tracker</Link>
        </div>
      </div>
      <aside className="vault-hero__waypoint">
        <span className="vault-eyebrow">Exam</span>
        <ExamCountdown />
      </aside>
    </section>
  )
}
