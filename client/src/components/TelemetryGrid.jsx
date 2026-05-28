import { Activity, CheckCircle2, Gauge, ShieldAlert, User } from 'lucide-react'

function riskTone(score) {
  if (score >= 8) return { label: 'Critical', color: '#ff4d6d' }
  if (score >= 5) return { label: 'Elevated', color: '#ffb020' }
  return { label: 'Stable', color: '#3ddc97' }
}

export default function TelemetryGrid({ analysis }) {
  const score = Number(analysis?.overallRiskScore) || 0
  const completeness = Number(analysis?.meddicCompleteness) || 0
  const completenessPercent = completeness <= 1 ? Math.round(completeness * 100) : Math.round(completeness)
  const tone = riskTone(score)

  return (
    <section className="argus-metrics">
      <article className="argus-metric-card">
        <div className="argus-metric-card__head">
          <span>Account Intel</span>
          <User size={16} />
        </div>
        <div className="argus-metric-card__value">{analysis?.repName || '—'}</div>
        <div className="argus-metric-card__sub">
          <strong>Account:</strong> {analysis?.accountName || '—'}
        </div>
        <div className="argus-metric-card__sub">
          <strong>Stage:</strong> {analysis?.dealStage || '—'}
        </div>
      </article>

      <article className="argus-metric-card">
        <div className="argus-metric-card__head">
          <span>Deal Risk Meter</span>
          <ShieldAlert size={16} color={tone.color} />
        </div>
        <div className="argus-metric-card__value">
          {score}<span className="argus-metric-card__scale">/10</span>
        </div>
        <div className="argus-metric-card__sub">
          Status: <strong style={{ color: tone.color }}>{tone.label}</strong>
        </div>
        <div className="argus-progress">
          <div className="argus-progress__fill" style={{ width: `${Math.max(0, Math.min(100, Math.round((score / 10) * 100)))}%` }} />
        </div>
      </article>

      <article className="argus-metric-card">
        <div className="argus-metric-card__head">
          <span>Framework Progress</span>
          <Gauge size={16} />
        </div>
        <div className="argus-metric-card__value">{completenessPercent}%</div>
        <div className="argus-metric-card__sub">
          MEDDIC markers detected and normalized into the analysis payload.
        </div>
        <div className="argus-progress">
          <div className="argus-progress__fill argus-progress__fill--green" style={{ width: `${completenessPercent}%` }} />
        </div>
      </article>
    </section>
  )
}