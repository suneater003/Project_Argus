import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  FileText,
  Gauge,
  Lightbulb,
  Mail,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'

const MEDDIC_FIELDS = [
  { key: 'metrics', label: 'Metrics' },
  { key: 'economicBuyer', label: 'Economic Buyer' },
  { key: 'decisionCriteria', label: 'Decision Criteria' },
  { key: 'decisionProcess', label: 'Decision Process' },
  { key: 'identifyPain', label: 'Identify Pain' },
  { key: 'champion', label: 'Champion' },
]

const CHART_COLORS = ['#10B981', '#334155', '#F59E0B', '#64748B']

const DONUT_SIZE = 240
const DONUT_STROKE = 26
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2

const THEME = {
  navy: '#0B1120',
  panel: '#1E293B',
  border: '#334155',
  borderSoft: 'rgba(148, 163, 184, 0.16)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function DonutChart({ data }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0)

  if (!total) {
    return null
  }

  let currentAngle = 0

  return (
    <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} width="100%" height="240" role="img" aria-label="Coaching mix donut chart">
      <circle
        cx={DONUT_SIZE / 2}
        cy={DONUT_SIZE / 2}
        r={DONUT_RADIUS}
        fill="none"
        stroke="rgba(148,163,184,0.12)"
        strokeWidth={DONUT_STROKE}
      />
      {data.map((entry, index) => {
        const sliceAngle = (entry.value / total) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + sliceAngle
        currentAngle = endAngle

        if (sliceAngle <= 0) {
          return null
        }

        return (
          <path
            key={entry.name}
            d={describeArc(DONUT_SIZE / 2, DONUT_SIZE / 2, DONUT_RADIUS, startAngle, endAngle)}
            fill="none"
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={DONUT_STROKE}
            strokeLinecap="round"
          />
        )
      })}
      <circle
        cx={DONUT_SIZE / 2}
        cy={DONUT_SIZE / 2}
        r={DONUT_RADIUS - DONUT_STROKE / 2}
        fill="rgba(15,23,42,0.98)"
        stroke="rgba(148,163,184,0.12)"
        strokeWidth="1"
      />
      <text x="50%" y="48%" textAnchor="middle" fill={THEME.text} fontSize="24" fontWeight="800" letterSpacing="-0.04em">
        {total}
      </text>
      <text x="50%" y="59%" textAnchor="middle" fill={THEME.muted} fontSize="11" fontWeight="700" letterSpacing="0.16em">
        SIGNALS
      </text>
    </svg>
  )
}

function confidenceTone(confidence) {
  const value = String(confidence || 'none').toLowerCase()
  if (value === 'high') return { label: 'High', color: THEME.emerald }
  if (value === 'medium') return { label: 'Medium', color: THEME.amber }
  if (value === 'low') return { label: 'Low', color: THEME.rose }
  return { label: 'None', color: THEME.muted }
}

function severityTone(severity) {
  const value = String(severity || 'medium').toLowerCase()
  if (value.includes('critical') || value.includes('high')) return { color: THEME.rose, label: 'High' }
  if (value.includes('low')) return { color: THEME.emerald, label: 'Low' }
  return { color: THEME.amber, label: 'Medium' }
}

function asTextList(items) {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item?.text) return String(item.text).trim()
      if (item?.value) return String(item.value).trim()
      return ''
    })
    .filter(Boolean)
}

function buildCrmPayload(data, emailDraft) {
  const accountName = data?.accountIntel?.accountName || 'your account'
  const repName = data?.accountIntel?.repName || 'your team'
  const identifyPain = data?.meddic?.elements?.identifyPain?.value || data?.meddic?.elements?.identifyPain?.quote || 'unresolved'

  return {
    source: 'Project Argus',
    accountName,
    repName,
    meddicCompleteness: data?.meddic?.completenessScore || 0,
    overallHandlingScore: data?.objectionAnalysis?.overallHandlingScore || 0,
    dealRiskScore: data?.dealIntelligence?.riskScore || 0,
    identifyPain,
    nextActions: asTextList(data?.dealIntelligence?.nextActions).slice(0, 4),
    followUpEmail: emailDraft,
    objectionCount: data?.objectionAnalysis?.objections?.length || 0,
    generatedAt: new Date().toISOString(),
  }
}

function buildEmailDraftText(data) {
  const accountName = data?.accountIntel?.accountName || 'your account'
  const repName = data?.accountIntel?.repName || 'your team'
  const identifyPain = data?.meddic?.elements?.identifyPain?.value || data?.meddic?.elements?.identifyPain?.quote || 'the primary business pain we discussed'
  const nextActions = asTextList(data?.dealIntelligence?.nextActions).slice(0, 4)
  const greeting = accountName === 'your account' ? 'Hi team,' : `Hi ${accountName} team,`

  return [
    `Subject: Follow-up on our conversation with ${accountName === 'your account' ? 'your team' : accountName}`,
    '',
    greeting,
    '',
    `Thanks for the conversation today. The core pain point I captured was ${identifyPain}.`,
    '',
    nextActions.length ? 'Recommended next steps:' : 'Recommended next steps will be shared after the next review:',
    ...(nextActions.length ? nextActions.map((action) => `- ${action}`) : ['- Confirm decision criteria and stakeholders', '- Validate timing and implementation path', '- Align on a clear follow-up meeting']),
    '',
    'If it would be helpful, I can also send a short summary of the key risks, objections, and MEDDIC gaps we identified.',
    '',
    'Best,',
    repName,
  ].join('\n')
}

function EmailDraft({ data }) {
  const draftText = buildEmailDraftText(data)
  const accountName = data?.accountIntel?.accountName || 'your account'
  const identifyPain = data?.meddic?.elements?.identifyPain?.value || data?.meddic?.elements?.identifyPain?.quote || 'Unclear pain'
  const nextActionCount = data?.dealIntelligence?.nextActions?.length || 0

  return (
    <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span className="argus-badge" style={{ borderColor: 'rgba(16,185,129,0.24)', color: THEME.emerald, background: 'rgba(16,185,129,0.08)' }}>{accountName}</span>
        <span className="argus-badge" style={{ borderColor: 'rgba(148,163,184,0.18)', color: THEME.text, background: 'rgba(255,255,255,0.03)' }}>{identifyPain}</span>
        <span className="argus-badge" style={{ borderColor: 'rgba(148,163,184,0.18)', color: THEME.muted, background: 'rgba(255,255,255,0.03)' }}>{nextActionCount} next actions</span>
      </div>

      <textarea
        defaultValue={draftText}
        rows={14}
        style={{
          width: '100%',
          resize: 'vertical',
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.16)',
          background: 'rgba(15,23,42,0.94)',
          color: THEME.text,
          padding: '1rem 1.1rem',
          lineHeight: 1.7,
          outline: 'none',
          fontFamily: 'inherit',
          boxShadow: 'none',
        }}
      />
    </div>
  )
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`argus-tab ${active ? 'is-active' : ''}`}
      style={{
        background: active ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(30,41,59,0.94))' : 'rgba(255,255,255,0.02)',
        borderColor: active ? 'rgba(16,185,129,0.34)' : 'rgba(148,163,184,0.16)',
        boxShadow: 'none',
        color: active ? THEME.text : THEME.muted,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function SectionCard({ title, icon, children }) {
  return (
    <div
      className="argus-card"
      style={{
        background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))',
        borderColor: 'rgba(148,163,184,0.14)',
        boxShadow: 'none',
      }}
    >
      <div
        className="argus-card__head"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: THEME.text,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {icon}
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function BulletList({ items, emptyLabel }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, color: THEME.text, lineHeight: 1.8 }}>
      {items.length ? items.map((item, index) => <li key={index}>{item}</li>) : <li>{emptyLabel}</li>}
    </ul>
  )
}

export default function AnalysisBoard({ analysisData, transcript, activeTab, setActiveTab, onQuoteSelect }) {
  const [showCrmModal, setShowCrmModal] = useState(false)
  const data = analysisData || {}
  const meddic = data.meddic || { completenessScore: 0, elements: {} }
  const objections = data.objectionAnalysis?.objections || []
  const dealIntelligence = data.dealIntelligence || { riskFactors: [], buyingSignals: [], nextActions: [], competitorMentions: [] }
  const repCoaching = data.repCoaching || { questionQuality: { openEndedExamples: [], closedExamples: [] }, top3CoachingPoints: [] }
  const accountName = data.accountIntel?.accountName || 'your account'

  const meddicEntries = MEDDIC_FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: meddic.elements?.[key]?.value,
    confidence: meddic.elements?.[key]?.confidence,
    quote: meddic.elements?.[key]?.quote,
    gapFlag: Boolean(meddic.elements?.[key]?.gapFlag),
    gapRecommendation: meddic.elements?.[key]?.gapRecommendation,
  }))

  const missingCount = meddicEntries.filter((entry) => entry.gapFlag).length
  const openCount = repCoaching.questionQuality?.openEndedExamples?.length || 0
  const closedCount = repCoaching.questionQuality?.closedExamples?.length || 0
  const coachingPointsCount = repCoaching.top3CoachingPoints?.length || 0
  const donutData = [
    { name: 'Open-ended', value: openCount },
    { name: 'Closed', value: closedCount },
    { name: 'Coaching points', value: coachingPointsCount },
  ].filter((entry) => entry.value > 0)

  const totalQuestionSignals = openCount + closedCount
  const questionBalance = totalQuestionSignals ? Math.round((openCount / totalQuestionSignals) * 100) : 0
  const talkRatio = repCoaching.estimatedTalkRatio || '—'

  const crmPayload = useMemo(() => buildCrmPayload(data, buildEmailDraftText(data)), [data])

  const panelStyle = {
    background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(11,17,32,0.98))',
    borderColor: 'rgba(148,163,184,0.14)',
    boxShadow: 'none',
  }

  return (
    <article className="argus-pane" style={panelStyle}>
      <div className="argus-pane__header" style={{ borderBottomColor: 'rgba(148,163,184,0.14)' }}>
        <div
          className="argus-pane__title"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: THEME.text,
          }}
        >
          <BrainCircuit size={18} color={THEME.emerald} />
          Extracted Command Center
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="argus-pill" style={{ borderColor: 'rgba(16,185,129,0.22)', color: THEME.text }}>
            <CheckCircle2 size={14} color={THEME.emerald} />
            {missingCount} MEDDIC gaps
          </div>
          <button
            type="button"
            className="argus-button argus-button--ghost"
            onClick={() => setShowCrmModal(true)}
            style={{ width: 'auto', padding: '10px 14px', borderColor: 'rgba(16,185,129,0.24)', background: 'rgba(16,185,129,0.06)', color: THEME.text }}
          >
            <Send size={14} />
            Sync to Salesforce
          </button>
        </div>
      </div>

      <div className="argus-tabs" style={{ paddingTop: 18 }}>
        <TabButton active={activeTab === 'meddic'} icon={<Sparkles size={14} color={THEME.emerald} />} label="MEDDIC" onClick={() => setActiveTab('meddic')} />
        <TabButton active={activeTab === 'objections'} icon={<ShieldAlert size={14} color={THEME.emerald} />} label="Objections" onClick={() => setActiveTab('objections')} />
        <TabButton active={activeTab === 'dealintel'} icon={<Target size={14} color={THEME.emerald} />} label="Deal Intel" onClick={() => setActiveTab('dealintel')} />
        <TabButton active={activeTab === 'coaching'} icon={<Lightbulb size={14} color={THEME.emerald} />} label="Coaching" onClick={() => setActiveTab('coaching')} />
        <TabButton active={activeTab === 'followup'} icon={<Mail size={14} color={THEME.emerald} />} label="Follow-up Email" onClick={() => setActiveTab('followup')} />
      </div>

      <div className="argus-tab-body" style={{ display: 'grid', gap: 14 }}>
        {activeTab === 'meddic' && (
          <>
            <SectionCard title="MEDDIC Extraction" icon={<Sparkles size={14} color={THEME.emerald} />}>
              <div className="argus-card__note" style={{ color: THEME.muted }}>
                The model mapped each MEDDIC element to a value, confidence, quote, and gap recommendation.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {meddicEntries.map((entry) => {
                const confidence = confidenceTone(entry.confidence)
                return (
                  <div
                    key={entry.key}
                    className="argus-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => entry.quote && onQuoteSelect?.(entry.quote)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && entry.quote) {
                        event.preventDefault()
                        onQuoteSelect?.(entry.quote)
                      }
                    }}
                    style={{
                      cursor: entry.quote ? 'pointer' : 'default',
                      transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                      background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))',
                      borderColor: 'rgba(148,163,184,0.14)',
                      boxShadow: 'none',
                    }}
                    onMouseEnter={(event) => {
                      if (entry.quote) {
                        event.currentTarget.style.borderColor = 'rgba(16,185,129,0.34)'
                        event.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'
                      event.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div className="argus-card__row" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                          <CheckCircle2 size={14} color={THEME.emerald} />
                          {entry.label}
                        </div>
                        <div style={{ marginTop: 8, color: THEME.text, lineHeight: 1.6, minHeight: 56 }}>{entry.value || '—'}</div>
                      </div>
                      <span className="argus-badge" style={{ borderColor: confidence.color, color: confidence.color, background: 'rgba(255,255,255,0.03)' }}>
                        {confidence.label} Confidence
                      </span>
                    </div>

                    <div style={{ color: THEME.muted, fontStyle: 'italic', borderLeft: '2px solid rgba(16,185,129,0.28)', paddingLeft: 12 }}>
                      {entry.quote || 'No verbatim quote provided.'}
                    </div>

                    {entry.gapFlag ? (
                      <div style={{ border: '1px solid rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: '12px 14px', color: '#FDE68A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}>
                          <AlertTriangle size={14} />
                          Gap detected
                        </div>
                        <div style={{ color: '#F59E0B' }}>{entry.gapRecommendation || 'Add a stronger question to close this qualification gap.'}</div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {activeTab === 'objections' && (
          <>
            <SectionCard title="Objection Analysis" icon={<ShieldAlert size={14} color={THEME.emerald} />}>
              <div className="argus-card__note" style={{ color: THEME.muted }}>
                Review each objection with its handling status and the AI-generated counter response.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gap: 14 }}>
              {objections.length ? objections.map((item, index) => {
                const tone = severityTone(item?.category || item?.handlingStatus)
                return (
                  <div key={`${item?.text || 'objection'}-${index}`} className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
                    <div className="argus-card__row" style={{ alignItems: 'flex-start' }}>
                      <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                        <MessageSquareText size={14} color={THEME.emerald} />
                        Objection {index + 1}
                      </div>
                      <span className="argus-badge" style={{ borderColor: tone.color, color: tone.color, background: 'rgba(255,255,255,0.03)' }}>
                        {item?.handlingStatus || 'Unknown'}
                      </span>
                    </div>

                    <div style={{ color: THEME.text, lineHeight: 1.7 }}>{item?.text || 'No objection text provided.'}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ border: '1px solid rgba(148,163,184,0.14)', borderRadius: 12, padding: 12 }}>
                        <div style={{ color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Type / Category</div>
                        <div style={{ color: THEME.text }}>{item?.type || '—'} / {item?.category || '—'}</div>
                      </div>
                      <div style={{ border: '1px solid rgba(148,163,184,0.14)', borderRadius: 12, padding: 12 }}>
                        <div style={{ color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Rep Handling</div>
                        <div style={{ color: THEME.text }}>{item?.handlingStatus || '—'}</div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '2px solid rgba(16,185,129,0.3)', paddingLeft: 12, color: '#E2E8F0' }}>
                      <div style={{ color: THEME.emerald, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Suggested AI Response</div>
                      {item?.suggestedResponse || 'No suggested response provided.'}
                    </div>
                  </div>
                )
              }) : (
                <SectionCard title="Objection Analysis" icon={<ShieldAlert size={14} color={THEME.emerald} />}>
                  <div className="argus-card__note" style={{ color: THEME.muted }}>No objections returned.</div>
                </SectionCard>
              )}
            </div>
          </>
        )}

        {activeTab === 'dealintel' && (
          <>
            <SectionCard title="Deal Intelligence" icon={<Target size={14} color={THEME.emerald} />}>
              <div className="argus-card__note" style={{ color: THEME.muted }}>
                Risk, momentum, competitor pressure, and next-step clarity from the call.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Trophy size={14} color={THEME.rose} />
                  Risk Factors
                </div>
                <BulletList items={dealIntelligence.riskFactors || []} emptyLabel="No risk factors returned." />
              </div>

              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Sparkles size={14} color={THEME.emerald} />
                  Buying Signals
                </div>
                <BulletList items={dealIntelligence.buyingSignals || []} emptyLabel="No buying signals returned." />
              </div>

              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Users size={14} color={THEME.emerald} />
                  Competitors
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(dealIntelligence.competitorMentions || []).length ? dealIntelligence.competitorMentions.map((item, index) => (
                    <div key={index} style={{ border: '1px solid rgba(148,163,184,0.14)', borderRadius: 12, padding: 12 }}>
                      <div style={{ color: THEME.text, fontWeight: 700 }}>{item.competitorName || 'Unknown competitor'}</div>
                      <div style={{ color: THEME.muted, marginTop: 6, lineHeight: 1.7 }}>{item.context || 'No context provided.'}</div>
                      <div style={{ color: item.handledWell ? THEME.emerald : THEME.amber, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CircleDot size={12} />
                        {item.handledWell ? 'Handled well' : 'Needs stronger handling'}
                      </div>
                    </div>
                  )) : <div style={{ color: THEME.muted }}>No competitor mentions returned.</div>}
                </div>
              </div>

              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <ArrowRight size={14} color={THEME.emerald} />
                  Next Actions
                </div>
                <BulletList items={dealIntelligence.nextActions || []} emptyLabel="No next actions returned." />
              </div>
            </div>
          </>
        )}

        {activeTab === 'coaching' && (
          <>
            <SectionCard title="Rep Coaching" icon={<BrainCircuit size={14} color={THEME.emerald} />}>
              <div className="argus-card__note" style={{ color: THEME.muted }}>
                Coaching guidance based on talk ratio, question quality, and the most actionable next steps.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'stretch' }}>
              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', height: '100%' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Gauge size={14} color={THEME.emerald} />
                  Talk Ratio
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ color: THEME.text, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{talkRatio}</div>
                  <div className="argus-progress">
                    <div className="argus-progress__fill" style={{ width: `${Math.min(100, Math.max(0, questionBalance || 35))}%`, background: `linear-gradient(90deg, ${THEME.emerald} 0%, #334155 100%)` }} />
                  </div>
                  <div style={{ color: THEME.muted }}>
                    Open-ended question balance: {questionBalance}% of tracked question examples.
                  </div>
                </div>
              </div>
              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', height: '100%' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Trophy size={14} color={THEME.emerald} />
                  Top Coaching Points
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 12, color: THEME.text }}>
                  {(repCoaching.top3CoachingPoints || []).length ? (repCoaching.top3CoachingPoints || []).map((pt, idx) => (
                    <li key={idx} style={{ lineHeight: 1.5 }}>{typeof pt === 'string' ? pt : (pt?.text || JSON.stringify(pt))}</li>
                  )) : <li>No coaching points returned.</li>}
                </ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'stretch' }}>
              <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                  <Lightbulb size={14} color={THEME.emerald} />
                  Coaching Mix
                </div>
                {donutData.length ? (
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                    <DonutChart data={donutData} />
                    <div style={{ display: 'grid', gap: 10, alignSelf: 'center' }}>
                      {donutData.map((entry, index) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10, color: THEME.text }}>
                          <span style={{ width: 12, height: 12, borderRadius: 999, background: CHART_COLORS[index % CHART_COLORS.length], boxShadow: 'none' }} />
                          <span style={{ minWidth: 110 }}>{entry.name}</span>
                          <span style={{ color: THEME.muted, fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="argus-empty-state">
                    <div>
                      <div className="argus-empty-state__title">No coaching data available</div>
                      <div>Open-ended and closed question examples were not returned for this call.</div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: 14, alignItems: 'stretch' }}>
                <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', height: '100%' }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                    <MessageSquareText size={14} color={THEME.emerald} />
                    Open Questions
                  </div>
                  <BulletList items={repCoaching.questionQuality?.openEndedExamples || []} emptyLabel="No open-ended question examples returned." />
                </div>
                <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none', height: '100%' }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                    <Zap size={14} color={THEME.amber} />
                    Closed Questions
                  </div>
                  <BulletList items={repCoaching.questionQuality?.closedExamples || []} emptyLabel="No closed question examples returned." />
                </div>
              </div>
            </div>

            <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', boxShadow: 'none' }}>
              <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.text }}>
                <ShieldAlert size={14} color={THEME.emerald} />
                Transcript Alignment
              </div>
              <div style={{ color: THEME.muted, lineHeight: 1.7 }}>
                {transcript ? 'Transcript text is available for quote-linked MEDDIC evidence and coaching review.' : 'Upload a transcript or audio file to populate the quote-linked coaching view.'}
              </div>
            </div>
          </>
        )}

        {activeTab === 'followup' && (
          <>
            <SectionCard title="Follow-up Email Draft" icon={<Mail size={14} color={THEME.emerald} />}>
              <div className="argus-card__note" style={{ color: THEME.muted }}>
                Editable draft generated from the account name, pain point, and next actions captured in the analysis.
              </div>
            </SectionCard>
            <EmailDraft data={data} />
          </>
        )}
      </div>

      {showCrmModal ? (
        <div
          className="argus-auth-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCrmModal(false)
            }
          }}
          style={{ background: 'rgba(2,6,23,0.78)' }}
        >
          <section className="argus-auth-modal" style={{ width: 'min(100%, 760px)' }}>
            <div className="argus-auth-modal__panel" style={{ gap: 14 }}>
              <div className="argus-auth-modal__header">
                <div>
                  <div className="argus-auth-modal__eyebrow">Sync Preview</div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color={THEME.emerald} />
                    Salesforce Webhook Payload
                  </h2>
                </div>
                <button
                  type="button"
                  className="argus-button argus-button--ghost"
                  onClick={() => setShowCrmModal(false)}
                  style={{ width: 'auto', padding: '10px 14px', borderColor: 'rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <X size={14} />
                  Close
                </button>
              </div>

              <div style={{ color: THEME.muted, lineHeight: 1.7 }}>
                This is a clean CRM-ready payload simulation you can hand to a webhook or middleware layer.
              </div>

              <pre
                style={{
                  margin: 0,
                  maxHeight: 420,
                  overflow: 'auto',
                  borderRadius: 18,
                  border: '1px solid rgba(148,163,184,0.14)',
                  background: 'rgba(15,23,42,0.96)',
                  color: THEME.text,
                  padding: '1rem 1.1rem',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(crmPayload, null, 2)}
              </pre>

              <div style={{ color: THEME.muted, fontSize: 13 }}>
                Account: {crmPayload.accountName} | Pain point: {crmPayload.identifyPain}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  )
}
