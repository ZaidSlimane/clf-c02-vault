import { saveExamDate, useExamDate } from '../services/examDate'

export default function ExamDateField() {
  const examDate = useExamDate()

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Exam date</h2>
      <p className="settings-desc">Sets the countdown on your overview. Saved in this browser.</p>
      <div className="settings-field">
        <label className="settings-label" htmlFor="exam-date">Date</label>
        <input
          id="exam-date"
          className="settings-input"
          type="date"
          value={examDate}
          onChange={(e) => saveExamDate(e.target.value)}
        />
      </div>
    </section>
  )
}
