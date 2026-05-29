import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { AlertTriangle, CheckCircle2, Gauge, ShieldAlert, Sparkles, User, Users } from 'lucide-react'

function riskTone(score) {
  if (score >= 8) return { label: 'Critical', color: '#F43F5E' }
  if (score >= 5) return { label: 'Elevated', color: '#F59E0B' }
  return { label: 'Stable', color: '#10B981' }
}

function handlingTone(score) {
  if (score >= 8) return { label: 'Strong', color: '#10B981' }
  if (score >= 5) return { label: 'Mixed', color: '#F59E0B' }
  return { label: 'Weak', color: '#F43F5E' }
}

function MetricCard({ title, icon, children, accent = '#10B981' }) {
  return (
    <article
      className="argus-metric-card"
      style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
        borderColor: 'rgba(148, 163, 184, 0.14)',
        boxShadow: 'none',
      }}
    >
      <div className="argus-metric-card__head">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F8FAFC' }}>
          {icon}
          {title}
        </span>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: 'none' }} />
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
          style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color} 0%, #334155 100%)` }}
        />
      </div>
    </MetricCard>
  )
}

function MeddicGauge({ completenessScore, mappedElements, totalElements, mappedPercent, mappedCount }) {
  const score = Math.max(0, Math.min(100, Number(completenessScore) || 0))
  const data = [
    { name: 'Covered', value: score },
    { name: 'Remaining', value: 100 - score },
  ]

  return (
    <div style={{ position: 'relative', height: '140px', minHeight: '140px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="100%"
            stroke="none"
          >
            <Cell key="meddic-covered" fill="#10B981" />
            <Cell key="meddic-remaining" fill="#334155" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          width: '100%',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: '#F8FAFC', fontSize: 34, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.04em' }}>
          {score}%
        </div>
        <div style={{ marginTop: 6, color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
          MEDDIC
        </div>
      </div>

      <div style={{ marginTop: 6, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
        {mappedCount}/{totalElements} elements identified. Confidence weighted.
      </div>
    </div>
  )
}

export default function TelemetryGrid({ analysisData }) {
  const data = analysisData || {}
  const accountIntel = data.accountIntel || {}
  const dealIntelligence = data.dealIntelligence || {}
  const meddic = data.meddic || {}
  const objectionAnalysis = data.objectionAnalysis || {}

  const riskScore = Number(dealIntelligence.riskScore) || 0
  // Compute a deterministic MEDDIC completeness score from element confidences
  const meddicElements = meddic.elements || {}
  const MEDDIC_KEYS = ['metrics', 'economicBuyer', 'decisionCriteria', 'decisionProcess', 'identifyPain', 'champion']
  const {
    computedCompleteness,
    mappedCount,
  } = (() => {
    let points = 0
    let mapped = 0

    MEDDIC_KEYS.forEach((key) => {
      const el = meddicElements[key]
      const conf = String(el?.confidence || '').toLowerCase()
      const hasValue = (el?.value && String(el.value).trim().length > 0) || (el?.quote && String(el.quote).trim().length > 0)
      if (hasValue) mapped += 1
      if (conf === 'high') points += 1
      else if (conf === 'medium') points += 0.5
    })

    const pct = Math.round((points / 6) * 100)
    return { computedCompleteness: pct, mappedCount: mapped }
  })()

  const completenessScore = Number(computedCompleteness) || 0
  const handlingScore = Number(objectionAnalysis.overallHandlingScore) || 0
  const risk = riskTone(riskScore)
  const handling = handlingTone(handlingScore)
  const mappedElements = Object.values(meddic.elements || {}).filter((entry) => (entry?.value && String(entry.value).trim().length > 0) || (entry?.quote && String(entry.quote).trim().length > 0))
  const totalElements = 6
  const mappedPercent = Math.round((mappedCount / totalElements) * 100)
  const objectionCount = objectionAnalysis.objections?.length || 0

  return (
    <section className="argus-metrics">
      <MetricCard title="Rep Intel" icon={<User size={16} />} accent="#10B981">
        <div className="argus-metric-card__value">{accountIntel.repName || '—'}</div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#F8FAFC' }}>Account:</strong> {accountIntel.accountName || '—'}</div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#F8FAFC' }}>Stage:</strong> {accountIntel.dealStageAssessment || '—'}</div>
      </MetricCard>

      <MetricCard title="Account Intel" icon={<Users size={16} />} accent="#1e3a8a">
        <div className="argus-metric-card__value" style={{ fontSize: 18, lineHeight: 1.35 }}>
          {accountIntel.accountName || '—'}
        </div>
        <div className="argus-metric-card__sub"><strong style={{ color: '#F8FAFC' }}>Assessment:</strong> {accountIntel.dealStageAssessment || '—'}</div>
        <div className="argus-metric-card__sub" style={{ color: '#94A3B8' }}>
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

      <MetricCard title="MEDDIC Progress" icon={<Gauge size={16} />} accent="#10B981">
        <MeddicGauge
          completenessScore={completenessScore}
          mappedElements={mappedElements}
          totalElements={totalElements}
          mappedPercent={mappedPercent}
          mappedCount={mappedCount}
        />
      </MetricCard>

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