export default function HeroHeader() {
  const target = new Date('2026-09-09')
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <section className="hero">
      <h1>AWS Certified Cloud Practitioner <span>CLF-C02</span></h1>
      <p className="hero-meta">Target: <strong>September 9, 2026</strong></p>
      <div className="hero-countdown">{diff} days remaining</div>
      <p className="hero-quote">One small session today moves you closer to certification.</p>
    </section>
  )
}
