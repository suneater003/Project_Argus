import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Flame,
  Gauge,
  Lightbulb,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  Users,
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

const CHART_COLORS = ['#00f0ff', '#1e3a8a', '#3ddc97', '#ffb020']

const DONUT_SIZE = 240
const DONUT_STROKE = 26
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2

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
        stroke="rgba(255,255,255,0.05)"
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
        fill="rgba(5,8,15,0.96)"
        stroke="rgba(0,240,255,0.12)"
        strokeWidth="1"
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        fill="#f4f7ff"
        fontSize="24"
        fontWeight="800"
        letterSpacing="-0.04em"
      >
        {total}
      </text>
      <text
        x="50%"
        y="59%"
        textAnchor="middle"
        fill="#aebbe0"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.16em"
      >
        Signals
      </text>
    </svg>
  )
}

function confidenceTone(confidence) {
  const value = String(confidence || 'none').toLowerCase()
  if (value === 'high') return { label: 'High', color: '#3ddc97' }
  if (value === 'medium') return { label: 'Medium', color: '#00f0ff' }
  if (value === 'low') return { label: 'Low', color: '#ffb020' }
  return { label: 'None', color: '#ff4d6d' }
}

function severityTone(severity) {
  const value = String(severity || 'medium').toLowerCase()
  if (value.includes('critical') || value.includes('high')) return { color: '#ff4d6d', label: 'High' }
  if (value.includes('low')) return { color: '#3ddc97', label: 'Low' }
  return { color: '#ffb020', label: 'Medium' }
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`argus-tab ${active ? 'is-active' : ''}`}
      style={{
        background: active ? 'linear-gradient(135deg, rgba(0,240,255,0.16), rgba(30,58,138,0.42))' : 'rgba(255,255,255,0.02)',
        borderColor: active ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)',
        boxShadow: active ? '0 0 0 1px rgba(0,240,255,0.12), 0 18px 40px rgba(0,0,0,0.3)' : 'none',
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
        background: 'linear-gradient(180deg, rgba(8,11,20,0.92), rgba(5,7,12,0.96))',
        borderColor: 'rgba(0,240,255,0.12)',
      }}
    >
      <div
        className="argus-card__head"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
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
    <ul style={{ margin: 0, paddingLeft: 18, color: '#f4f7ff', lineHeight: 1.8 }}>
      {items.length ? items.map((item, index) => <li key={index}>{item}</li>) : <li>{emptyLabel}</li>}
    </ul>
  )
}

export default function AnalysisBoard({ analysisData, transcript, activeTab, setActiveTab, onQuoteSelect }) {
  const data = analysisData || {}
  const meddic = data.meddic || { completenessScore: 0, elements: {} }
  const objections = data.objectionAnalysis?.objections || []
  const dealIntelligence = data.dealIntelligence || { riskFactors: [], buyingSignals: [], nextActions: [], competitorMentions: [] }
  const repCoaching = data.repCoaching || { questionQuality: { openEndedExamples: [], closedExamples: [] }, top3CoachingPoints: [] }

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

  const panelStyle = {
    background: 'linear-gradient(180deg, rgba(5,8,15,0.98), rgba(8,10,16,0.96))',
    borderColor: 'rgba(0,240,255,0.14)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.42)',
  }

  return (
    <article className="argus-pane" style={panelStyle}>
      <div className="argus-pane__header" style={{ borderBottomColor: 'rgba(0,240,255,0.12)' }}>
        <div
          className="argus-pane__title"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <BrainCircuit size={18} color="#00f0ff" />
          Extracted Command Center
        </div>
        <div className="argus-pill" style={{ borderColor: 'rgba(0,240,255,0.22)', color: '#dbeafe' }}>
          <CheckCircle2 size={14} color="#00f0ff" />
          {missingCount} MEDDIC gaps
        </div>
      </div>

      <div className="argus-tabs" style={{ paddingTop: 18 }}>
        <TabButton active={activeTab === 'meddic'} icon={<Sparkles size={14} />} label="MEDDIC" onClick={() => setActiveTab('meddic')} />
        <TabButton active={activeTab === 'objections'} icon={<ShieldAlert size={14} />} label="Objections" onClick={() => setActiveTab('objections')} />
        <TabButton active={activeTab === 'dealintel'} icon={<Target size={14} />} label="Deal Intel" onClick={() => setActiveTab('dealintel')} />
        <TabButton active={activeTab === 'coaching'} icon={<Lightbulb size={14} />} label="Coaching" onClick={() => setActiveTab('coaching')} />
      </div>

      <div className="argus-tab-body" style={{ display: 'grid', gap: 14 }}>
        {activeTab === 'meddic' && (
          <>
            <SectionCard title="MEDDIC Extraction" icon={<Sparkles size={14} color="#00f0ff" />}>
              <div className="argus-card__note" style={{ color: '#aebbe0' }}>
                The model has mapped each MEDDIC element to a value, confidence, quote, and gap recommendation.
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
                    }}
                    onMouseEnter={(event) => {
                      if (entry.quote) {
                        event.currentTarget.style.borderColor = 'rgba(0,240,255,0.32)'
                        event.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,240,255,0.08), 0 18px 36px rgba(0,0,0,0.28)'
                        event.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.borderColor = 'rgba(0,240,255,0.12)'
                      event.currentTarget.style.boxShadow = 'none'
                      event.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div className="argus-card__row" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={14} color="#00f0ff" />
                          {entry.label}
                        </div>
                        <div style={{ marginTop: 8, color: '#f4f7ff', lineHeight: 1.6, minHeight: 56 }}>{entry.value || '—'}</div>
                      </div>
                      <span className="argus-badge" style={{ borderColor: confidence.color, color: confidence.color, background: 'rgba(255,255,255,0.03)' }}>
                        {confidence.label} Confidence
                      </span>
                    </div>

                    <div style={{ color: '#7dd3fc', fontStyle: 'italic', borderLeft: '2px solid rgba(0,240,255,0.35)', paddingLeft: 12 }}>
                      {entry.quote || 'No verbatim quote provided.'}
                    </div>

                    {entry.gapFlag ? (
                      <div style={{ border: '1px solid rgba(255,176,32,0.28)', background: 'rgba(255,176,32,0.08)', borderRadius: 12, padding: '12px 14px', color: '#ffd58b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}>
                          <AlertTriangle size={14} />
                          Gap detected
                        </div>
                        <div style={{ color: '#fbbf24' }}>{entry.gapRecommendation || 'Add a stronger question to close this qualification gap.'}</div>
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
            <SectionCard title="Objection Analysis" icon={<ShieldAlert size={14} color="#00f0ff" />}>
              <div className="argus-card__note" style={{ color: '#aebbe0' }}>
                Review each objection with its handling status and the AI-generated counter response.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gap: 14 }}>
              {objections.length ? objections.map((item, index) => {
                const tone = severityTone(item?.category || item?.handlingStatus)
                return (
                  <div key={`${item?.text || 'objection'}-${index}`} className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                    <div className="argus-card__row" style={{ alignItems: 'flex-start' }}>
                      <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageSquareText size={14} color="#00f0ff" />
                        Objection {index + 1}
                      </div>
                      <span className="argus-badge" style={{ borderColor: tone.color, color: tone.color, background: 'rgba(255,255,255,0.03)' }}>
                        {item?.handlingStatus || 'Unknown'}
                      </span>
                    </div>

                    <div style={{ color: '#f4f7ff', lineHeight: 1.7 }}>{item?.text || 'No objection text provided.'}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ border: '1px solid rgba(0,240,255,0.12)', borderRadius: 12, padding: 12 }}>
                        <div style={{ color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Type / Category</div>
                        <div style={{ color: '#f4f7ff' }}>{item?.type || '—'} / {item?.category || '—'}</div>
                      </div>
                      <div style={{ border: '1px solid rgba(0,240,255,0.12)', borderRadius: 12, padding: 12 }}>
                        <div style={{ color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Rep Handling</div>
                        <div style={{ color: '#f4f7ff' }}>{item?.handlingStatus || '—'}</div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '2px solid rgba(0,240,255,0.35)', paddingLeft: 12, color: '#dbeafe' }}>
                      <div style={{ color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, marginBottom: 6 }}>Suggested AI Response</div>
                      {item?.suggestedResponse || 'No suggested response provided.'}
                    </div>
                  </div>
                )
              }) : (
                <SectionCard title="Objection Analysis" icon={<ShieldAlert size={14} color="#00f0ff" />}>
                  <div className="argus-card__note">No objections returned.</div>
                </SectionCard>
              )}
            </div>
          </>
        )}

        {activeTab === 'dealintel' && (
          <>
            <SectionCard title="Deal Intelligence" icon={<Target size={14} color="#00f0ff" />}>
              <div className="argus-card__note" style={{ color: '#aebbe0' }}>
                Risk, momentum, competitor pressure, and next-step clarity from the call.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={14} color="#ff4d6d" />
                  Risk Factors
                </div>
                <BulletList items={dealIntelligence.riskFactors || []} emptyLabel="No risk factors returned." />
              </div>

              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color="#3ddc97" />
                  Buying Signals
                </div>
                <BulletList items={dealIntelligence.buyingSignals || []} emptyLabel="No buying signals returned." />
              </div>

              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={14} color="#00f0ff" />
                  Competitors
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(dealIntelligence.competitorMentions || []).length ? dealIntelligence.competitorMentions.map((item, index) => (
                    <div key={index} style={{ border: '1px solid rgba(0,240,255,0.12)', borderRadius: 12, padding: 12 }}>
                      <div style={{ color: '#f4f7ff', fontWeight: 700 }}>{item.competitorName || 'Unknown competitor'}</div>
                      <div style={{ color: '#aebbe0', marginTop: 6, lineHeight: 1.7 }}>{item.context || 'No context provided.'}</div>
                      <div style={{ color: item.handledWell ? '#3ddc97' : '#ffb020', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CircleDot size={12} />
                        {item.handledWell ? 'Handled well' : 'Needs stronger handling'}
                      </div>
                    </div>
                  )) : <div style={{ color: '#aebbe0' }}>No competitor mentions returned.</div>}
                </div>
              </div>

              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRight size={14} color="#00f0ff" />
                  Next Actions
                </div>
                <BulletList items={dealIntelligence.nextActions || []} emptyLabel="No next actions returned." />
              </div>
            </div>
          </>
        )}

        {activeTab === 'coaching' && (
          <>
            <SectionCard title="Rep Coaching" icon={<BrainCircuit size={14} color="#00f0ff" />}>
              <div className="argus-card__note" style={{ color: '#aebbe0' }}>
                Coaching guidance based on talk ratio, question quality, and the most actionable next steps.
              </div>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 14 }}>
              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gauge size={14} color="#00f0ff" />
                  Talk Ratio
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ color: '#f4f7ff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{talkRatio}</div>
                  <div className="argus-progress">
                    <div className="argus-progress__fill" style={{ width: `${Math.min(100, Math.max(0, questionBalance || 35))}%` }} />
                  </div>
                  <div style={{ color: '#aebbe0' }}>
                    Open-ended question balance: {questionBalance}% of tracked question examples.
                  </div>
                </div>
              </div>

              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={14} color="#3ddc97" />
                  Top Coaching Points
                </div>
                <BulletList items={repCoaching.top3CoachingPoints || []} emptyLabel="No coaching points returned." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 14 }}>
              <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)', minHeight: 320 }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lightbulb size={14} color="#00f0ff" />
                  Coaching Mix
                </div>
                {donutData.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 18, alignItems: 'center' }}>
                    <DonutChart data={donutData} />
                    <div style={{ display: 'grid', gap: 10, alignSelf: 'center' }}>
                      {donutData.map((entry, index) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#dbeafe' }}>
                          <span style={{ width: 12, height: 12, borderRadius: 999, background: CHART_COLORS[index % CHART_COLORS.length], boxShadow: '0 0 0 3px rgba(255,255,255,0.04)' }} />
                          <span style={{ minWidth: 110 }}>{entry.name}</span>
                          <span style={{ color: '#aebbe0', fontVariantNumeric: 'tabular-nums' }}>{entry.value}</span>
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

              <div style={{ display: 'grid', gap: 14 }}>
                <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquareText size={14} color="#00f0ff" />
                    Open Questions
                  </div>
                  <BulletList items={repCoaching.questionQuality?.openEndedExamples || []} emptyLabel="No open-ended question examples returned." />
                </div>

                <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} color="#ffb020" />
                    Closed Questions
                  </div>
                  <BulletList items={repCoaching.questionQuality?.closedExamples || []} emptyLabel="No closed question examples returned." />
                </div>
              </div>
            </div>

            <div className="argus-card" style={{ background: 'rgba(8,10,18,0.94)' }}>
              <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={14} color="#00f0ff" />
                Transcript Alignment
              </div>
              <div style={{ color: '#aebbe0', lineHeight: 1.7 }}>
                {transcript ? 'Transcript text is available for quote-linked MEDDIC evidence and coaching review.' : 'Upload a transcript or audio file to populate the quote-linked coaching view.'}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
