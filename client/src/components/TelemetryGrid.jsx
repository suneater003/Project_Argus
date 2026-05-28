import { AlertTriangle, CheckCircle2, Gauge, ShieldAlert, Sparkles, User, Users } from 'lucide-react'

function riskTone(score) {
  if (score >= 8) return { label: 'Critical', color: '#ff4d6d' }
  if (score >= 5) return { label: 'Elevated', color: '#ffb020' }
  return { label: 'Stable', color: '#3ddc97' }
}

function handlingTone(score) {
  if (score >= 8) return { label: 'Strong', color: '#3ddc97' }
  if (score >= 5) return { label: 'Mixed', color: '#ffb020' }
  return { label: 'Weak', color: '#ff4d6d' }
}

function MetricCard({ title, icon, children, accent = '#00f0ff' }) {
  return (
    <article
      className="argus-metric-card"
      style={{ borderColor: 'rgba(0, 240, 255, 0.12)' }}
    >
      <div className="argus-metric-card__head">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {icon}
          {title}
        </span>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: `0 0 18px ${accent}` }} />
      </div>
      {children}
    </article>
  )
}

function ProgressCard({ title, valueText, percent, color, icon, note }) {
  return (
    <MetricCard title={title} icon={icon} accent={color}>
      <div className="argus-metric-card__value">
        {valueText}
      </div>
      <div className="argus-metric-card__sub">
        {note}
      </div>
      <div className="argus-progress">
        <div
          className="argus-progress__fill"
          style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color} 0%, #1e3a8a 100%)` }}
        />
      </div>
    </MetricCard>
  )
}

export default function TelemetryGrid({ analysisData }) {
  const data = analysisData || {}
  const accountIntel = data.accountIntel || {}
  const dealIntelligence = data.dealIntelligence || {}
  const meddic = data.meddic || {}
  const objectionAnalysis = data.objectionAnalysis || {}

  const riskScore = Number(dealIntelligence.riskScore) || 0
  const completenessScore = Number(meddic.completenessScore) || 0
  const handlingScore = Number(objectionAnalysis.overallHandlingScore) || 0
  const risk = riskTone(riskScore)
  const handling = handlingTone(handlingScore)
  const mappedElements = Object.values(meddic.elements || {}).filter((entry) => entry?.value && String(entry.value).trim().length > 0)
  const totalElements = Object.keys(meddic.elements || {}).length || 6
  const mappedPercent = Math.round((mappedElements.length / totalElements) * 100)
  const objectionCount = objectionAnalysis.objections?.length || 0

  return (
    <section className="argus-metrics">
      <MetricCard title="Rep Intel" icon={<User size={16} />} accent="#00f0ff">
        <div className="argus-metric-card__value">{accountIntel.repName || '—'}</div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#f4f7ff' }}>Account:</strong> {accountIntel.accountName || '—'}</div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#f4f7ff' }}>Stage:</strong> {accountIntel.dealStageAssessment || '—'}</div>
      </MetricCard>

      <MetricCard title="Account Intel" icon={<Users size={16} />} accent="#1e3a8a">
        <div className="argus-metric-card__value" style={{ fontSize: 18, lineHeight: 1.35 }}>
          {accountIntel.accountName || '—'}
        </div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#f4f7ff' }}>Assessment:</strong> {accountIntel.dealStageAssessment || '—'}</div>
        <div className="argus-metric-card__sub" style={{ color: '#7df9ff' }}>
          Enterprise call signal.
        </div>
      </MetricCard>

      <ProgressCard
        title="Deal Risk Meter"
        icon={<ShieldAlert size={16} />}
        valueText={`${riskScore}/10`}
        percent={Math.max(0, Math.min(100, Math.round((riskScore / 10) * 100)))}
        color={risk.color}
        note={`${risk.label} risk across ${dealIntelligence.riskFactors?.length || 0} tracked factors.`}
      />

      <ProgressCard
        title="MEDDIC Progress"
        icon={<Gauge size={16} />}
        valueText={`${completenessScore}%`}
        percent={Math.max(0, Math.min(100, completenessScore))}
        color="#00f0ff"
        note={`${mappedElements.length}/${totalElements} elements mapped, ${mappedPercent}% covered.`}
      />

      <MetricCard title="Handling Score" icon={<CheckCircle2 size={16} />} accent={handling.color}>
        <div className="argus-metric-card__value">
          {handlingScore}/10
        </div>
        <div className="argus-metric-card__sub" style={{ color: handling.color }}>
          {handling.label} objection handling
        </div>
        <div className="argus-metric-card__sub">
          {objectionCount} structured objections tracked.
        </div>
      </MetricCard>

      <MetricCard title="Signal Density" icon={<Sparkles size={16} />} accent="#3ddc97">
        <div className="argus-metric-card__value">
          {mappedElements.length + objectionCount}
        </div>
        <div className="argus-metric-card__sub">
          Qualified MEDDIC evidence plus objection handling signals.
        </div>
        <div className="argus-progress">
          <div
            className="argus-progress__fill argus-progress__fill--green"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(((mappedElements.length + objectionCount) / 12) * 100)))}%` }}
          />
        </div>
      </MetricCard>
    </section>
  )
}