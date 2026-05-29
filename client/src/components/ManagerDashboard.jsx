import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Gauge, RefreshCw, ShieldAlert, Sparkles, Users } from 'lucide-react'
import { fetchHistory } from '../services/api.js'

const PALETTE = {
  navy: '#0B1120',
  panel: '#1E293B',
  panelSoft: '#0F172A',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  blue: '#3B82F6',
}

function getCallData(call) {
  let payload = call?.data || call?.analysisData

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (e) {
      payload = {}
    }
  }

  return payload && typeof payload === 'object' ? payload : {}
}

function getRepName(call) {
  const repName = getCallData(call)?.accountIntel?.repName
  return typeof repName === 'string' && repName.trim() ? repName.trim() : 'Unknown Rep'
}

function getHandlingScore(call) {
  const value = Number(getCallData(call)?.objectionAnalysis?.overallHandlingScore)
  return Number.isFinite(value) ? value : 0
}

function getMeddicScore(call) {
  const value = Number(getCallData(call)?.meddic?.completenessScore)
  return Number.isFinite(value) ? value : 0
}

function getRiskScore(call) {
  const value = Number(getCallData(call)?.dealIntelligence?.riskScore)
  return Number.isFinite(value) ? value : 0
}

function getObjections(call) {
  const objections = getCallData(call)?.objectionAnalysis?.objections
  return Array.isArray(objections) ? objections : []
}

function getAccountName(call) {
  const accountName = getCallData(call)?.accountIntel?.accountName
  return typeof accountName === 'string' && accountName.trim() ? accountName.trim() : 'Unknown Account'
}

function getCallCreatedAt(call) {
  const createdAt = call?.createdAt || call?.updatedAt
  const timestamp = Date.parse(createdAt)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function scoreTone(score) {
  if (score >= 8) return { label: 'Top Quartile', color: PALETTE.emerald }
  if (score >= 7) return { label: 'Strong', color: PALETTE.blue }
  if (score >= 6) return { label: 'Stable', color: PALETTE.amber }
  return { label: 'Needs Coaching', color: PALETTE.rose }
}

function formatPercent(value) {
  return `${Math.round(value)}%`
}

function formatOneDecimal(value) {
  return value.toFixed(1)
}

function StatCard({ label, value, note, color }) {
  return (
    <article
      className="argus-card"
      style={{
        background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))',
        borderColor: 'rgba(148,163,184,0.14)',
        padding: '1.75rem',
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: PALETTE.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{label}</div>
          <div style={{ marginTop: 12, color: PALETTE.text, fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
          <div style={{ marginTop: 8, color: PALETTE.muted, lineHeight: 1.6 }}>{note}</div>
        </div>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: color }} />
      </div>
    </article>
  )
}

function TooltipCard({ title, series }) {
  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.16)',
        background: 'rgba(15, 23, 42, 0.96)',
        color: PALETTE.text,
        borderRadius: 14,
        padding: '10px 12px',
        boxShadow: 'none',
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
        {series.map((entry) => (
          <div key={entry.label} style={{ color: entry.color }}>
            {entry.label}: {entry.value}
          </div>
        ))}
      </div>
    </div>
  )
}

function SimpleBarChart({ data, height = 260 }) {
  const maxValue = Math.max(...data.map((entry) => entry.count), 1)
  const chartWidth = 720
  const chartHeight = height
  const margin = { top: 24, right: 16, bottom: 36, left: 16 }
  const barAreaWidth = chartWidth - margin.left - margin.right
  const barAreaHeight = chartHeight - margin.top - margin.bottom
  const barWidth = barAreaWidth / data.length - 14

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={height} role="img" aria-label="Common objections bar chart">
      <line x1={margin.left} y1={chartHeight - margin.bottom} x2={chartWidth - margin.right} y2={chartHeight - margin.bottom} stroke="rgba(148,163,184,0.18)" />
      {data.map((entry, index) => {
        const barHeight = (entry.count / maxValue) * barAreaHeight
        const x = margin.left + index * (barAreaWidth / data.length) + 8
        const y = chartHeight - margin.bottom - barHeight
        const fill = index === 0 ? PALETTE.emerald : index === 1 ? PALETTE.blue : index === 2 ? PALETTE.amber : index === 3 ? PALETTE.rose : PALETTE.border

        return (
          <g key={entry.name}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="10" fill={fill} />
            <text x={x + barWidth / 2} y={chartHeight - 14} textAnchor="middle" fill={PALETTE.muted} fontSize="12">
              {entry.name}
            </text>
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fill={PALETTE.text} fontSize="12" fontWeight="700">
              {entry.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SimpleLineChart({ data, height = 280 }) {
  const width = 720
  const chartHeight = height
  const chartWidth = width
  const margin = { top: 24, right: 20, bottom: 42, left: 36 }
  const plotWidth = chartWidth - margin.left - margin.right
  const plotHeight = chartHeight - margin.top - margin.bottom

  const completenessPoints = data.map((entry, index) => {
    const x = margin.left + (plotWidth / (data.length - 1 || 1)) * index
    const y = margin.top + plotHeight - (entry.completeness / 100) * plotHeight
    return { x, y }
  })

  const riskMax = Math.max(...data.map((entry) => entry.risk), 10)
  const riskPoints = data.map((entry, index) => {
    const x = margin.left + (plotWidth / (data.length - 1 || 1)) * index
    const y = margin.top + plotHeight - (entry.risk / riskMax) * plotHeight
    return { x, y }
  })

  const pathFromPoints = (points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={height} role="img" aria-label="Account health trend line chart">
      <line x1={margin.left} y1={margin.top + plotHeight} x2={chartWidth - margin.right} y2={margin.top + plotHeight} stroke="rgba(148,163,184,0.18)" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="rgba(148,163,184,0.18)" />

      {[25, 50, 75, 100].map((tick) => {
        const y = margin.top + plotHeight - (tick / 100) * plotHeight
        return (
          <g key={tick}>
            <line x1={margin.left} y1={y} x2={chartWidth - margin.right} y2={y} stroke="rgba(148,163,184,0.08)" />
            <text x={8} y={y + 4} fill={PALETTE.muted} fontSize="11">
              {tick}%
            </text>
          </g>
        )
      })}

      <path d={pathFromPoints(completenessPoints)} fill="none" stroke={PALETTE.emerald} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathFromPoints(riskPoints)} fill="none" stroke={PALETTE.rose} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {completenessPoints.map((point, index) => (
        <circle key={`complete-${index}`} cx={point.x} cy={point.y} r="4" fill={PALETTE.emerald} />
      ))}

      {riskPoints.map((point, index) => (
        <circle key={`risk-${index}`} cx={point.x} cy={point.y} r="4" fill={PALETTE.rose} />
      ))}

      {data.map((entry, index) => {
        const x = margin.left + (plotWidth / (data.length - 1 || 1)) * index
        return (
          <text key={entry.week} x={x} y={chartHeight - 16} textAnchor="middle" fill={PALETTE.muted} fontSize="12">
            {entry.week}
          </text>
        )
      })}
    </svg>
  )
}

export default function ManagerDashboard() {
  const [historyItems, setHistoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadHistory = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await fetchHistory()
        if (!active) return
        setHistoryItems(Array.isArray(payload.items) ? payload.items : [])
      } catch (err) {
        if (!active) return
        setError(err?.message || 'Unable to load manager history.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [])

  const summary = useMemo(() => {
    const meddicScores = historyItems.map(getMeddicScore)
    const riskScores = historyItems.map(getRiskScore)
    const handlingScores = historyItems.map(getHandlingScore)

    return {
      averageMeddic: average(meddicScores),
      averageRisk: average(riskScores),
      averageHandling: average(handlingScores),
      portfolioCoverage: historyItems.length ? Math.round((historyItems.filter((item) => getMeddicScore(item) > 0).length / historyItems.length) * 100) : 0,
    }
  }, [historyItems])

  const leaderboard = useMemo(() => {
    const grouped = historyItems.reduce((accumulator, call) => {
      const key = getRepName(call)
      const handlingScore = getHandlingScore(call)
      const meddicScore = getMeddicScore(call)

      if (!accumulator[key]) {
        accumulator[key] = {
          rep: key,
          deals: 0,
          handlingTotal: 0,
          meddicTotal: 0,
        }
      }

      accumulator[key].deals += 1
      accumulator[key].handlingTotal += handlingScore
      accumulator[key].meddicTotal += meddicScore
      return accumulator
    }, {})

    return Object.values(grouped)
      .map((row) => {
        const averageHandling = row.deals ? row.handlingTotal / row.deals : 0
        const averageCompleteness = row.deals ? row.meddicTotal / row.deals : 0
        const combinedScore = Math.round((averageHandling * 10 + averageCompleteness) / 2)

        return {
          rep: row.rep,
          deals: row.deals,
          overallHandlingScore: averageHandling,
          completenessScore: averageCompleteness,
          combinedScore,
        }
      })
      .sort((left, right) => right.combinedScore - left.combinedScore)
  }, [historyItems])

  const dynamicTrendData = useMemo(() => {
    const accountCounts = historyItems.reduce((accumulator, call) => {
      const accountName = getAccountName(call)
      accumulator[accountName] = (accumulator[accountName] || 0) + 1
      return accumulator
    }, {})

    const sortedAccounts = Object.entries(accountCounts).sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return left[0].localeCompare(right[0])
    })

    const namedAccounts = sortedAccounts.filter(([name]) => name !== 'Unknown Account')
    const accountName = namedAccounts[0]?.[0] || sortedAccounts[0]?.[0] || 'Unknown Account'

    const accountCalls = historyItems
      .filter((call) => getAccountName(call) === accountName)
      .slice()
      .sort((left, right) => getCallCreatedAt(left) - getCallCreatedAt(right))
      .slice(-5)

    const data = accountCalls.map((call, index) => ({
      week: `Call ${index + 1}`,
      completeness: getMeddicScore(call),
      risk: getRiskScore(call),
    }))

    return {
      accountName,
      data: data.length ? data : [{ week: 'Call 1', completeness: 0, risk: 0 }],
    }
  }, [historyItems])

  const objectionFrequency = useMemo(() => {
    const categoryCounts = historyItems.reduce((accumulator, item) => {
      const objections = getObjections(item)
      objections.forEach((objection) => {
        const category = String(objection?.category || 'Other').trim() || 'Other'
        accumulator[category] = (accumulator[category] || 0) + 1
      })
      return accumulator
    }, {})

    const ordered = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)

    if (!ordered.length) {
      return [
        { name: 'Price', count: 0 },
        { name: 'Timing', count: 0 },
        { name: 'Authority', count: 0 },
        { name: 'Budget', count: 0 },
        { name: 'Competition', count: 0 },
      ]
    }

    return ordered.slice(0, 5)
  }, [historyItems])

  const topRep = leaderboard[0]
  const topTone = scoreTone((topRep?.combinedScore || 0) / 10)

  return (
    <article
      className="argus-pane"
      style={{
        minHeight: 'auto',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(11,17,32,0.98))',
        borderColor: 'rgba(148,163,184,0.14)',
        boxShadow: 'none',
      }}
    >
      <div className="argus-pane__header" style={{ borderBottomColor: 'rgba(148,163,184,0.14)' }}>
        <div className="argus-pane__title" style={{ color: PALETTE.text }}>
          <Users size={18} color={PALETTE.emerald} />
          Manager Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="argus-pill" style={{ borderColor: 'rgba(16,185,129,0.22)', color: PALETTE.text }}>
            <ArrowUpRight size={14} color={PALETTE.emerald} />
            Portfolio snapshot
          </div>
          <button
            type="button"
            className="argus-button argus-button--ghost"
            onClick={() => window.location.reload()}
            style={{ width: 'auto', padding: '10px 14px', borderColor: 'rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.03)' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '1.75rem', display: 'grid', gap: 20 }}>
        <section className="argus-card" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96))', borderColor: 'rgba(148,163,184,0.14)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 720 }}>
              <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.text }}>
                <Sparkles size={14} color={PALETTE.emerald} />
                Executive overview
              </div>
              <h2 style={{ margin: '12px 0 0', fontSize: 'clamp(28px, 3vw, 40px)', letterSpacing: '-0.04em', color: PALETTE.text }}>
                Calm, readable portfolio intelligence for sales leaders.
              </h2>
              <p style={{ margin: '12px 0 0', color: PALETTE.muted, lineHeight: 1.7, maxWidth: 680 }}>
                This manager view calculates performance directly from secured call history and surfaces portfolio-level MEDDIC coverage, deal risk, rep execution, and objection patterns.
              </p>
            </div>
            <div style={{ minWidth: 220, padding: '1rem 1.1rem', borderRadius: 18, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)' }}>
              <div style={{ color: PALETTE.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Top rep</div>
              <div style={{ marginTop: 8, color: PALETTE.text, fontSize: 24, fontWeight: 800 }}>{topRep?.rep || '—'}</div>
              <div style={{ marginTop: 6, color: topTone.color }}>{topTone.label} combined score</div>
            </div>
          </div>
        </section>

        <section className="argus-metrics" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <StatCard label="Average MEDDIC Score" value={formatPercent(summary.averageMeddic)} note="Portfolio-wide completeness across secured calls." color={PALETTE.emerald} />
          <StatCard label="Average Deal Risk" value={formatOneDecimal(summary.averageRisk)} note="Lower is better. Based on saved history entries." color={PALETTE.amber} />
          <StatCard label="Average Handling Score" value={formatOneDecimal(summary.averageHandling)} note="Rep objection handling across the call archive." color={PALETTE.blue} />
          <StatCard label="Portfolio Coverage" value={formatPercent(summary.portfolioCoverage)} note="Calls with measurable MEDDIC signal." color={PALETTE.rose} />
        </section>

        {error ? (
          <div className="argus-error" style={{ borderColor: 'rgba(244,63,94,0.28)', color: '#fecdd3' }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="argus-card" style={{ background: 'rgba(30,41,59,0.96)', borderColor: 'rgba(148,163,184,0.14)', padding: '1.75rem', color: PALETTE.muted }}>
            Loading manager history...
          </div>
        ) : (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: 20, alignItems: 'start' }}>
            <div className="argus-card" style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))', borderColor: 'rgba(148,163,184,0.14)', padding: '1.75rem' }}>
              <div className="argus-card__row" style={{ marginBottom: 18 }}>
                <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.text }}>
                  <Gauge size={14} color={PALETTE.emerald} />
                  Rep Leaderboard
                </div>
                <span className="argus-badge" style={{ borderColor: 'rgba(16,185,129,0.24)', color: PALETTE.emerald, background: 'rgba(16,185,129,0.08)' }}>
                  Ranked by handling + completeness
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                  <thead>
                    <tr style={{ color: PALETTE.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 11 }}>
                      <th style={{ padding: '0 0 14px' }}>Rank</th>
                      <th style={{ padding: '0 0 14px' }}>Rep</th>
                      <th style={{ padding: '0 0 14px' }}>Deals</th>
                      <th style={{ padding: '0 0 14px' }}>Handling</th>
                      <th style={{ padding: '0 0 14px' }}>MEDDIC</th>
                      <th style={{ padding: '0 0 14px' }}>Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, index) => (
                      <tr key={row.rep} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
                        <td style={{ padding: '16px 0', color: PALETTE.text, fontWeight: 800 }}>#{index + 1}</td>
                        <td style={{ padding: '16px 0', color: PALETTE.text }}>{row.rep}</td>
                        <td style={{ padding: '16px 0', color: PALETTE.muted }}>{row.deals}</td>
                        <td style={{ padding: '16px 0', color: PALETTE.text }}>{row.overallHandlingScore.toFixed(1)}</td>
                        <td style={{ padding: '16px 0', color: PALETTE.text }}>{Math.round(row.completenessScore)}%</td>
                        <td style={{ padding: '16px 0' }}>
                          <span className="argus-badge" style={{ borderColor: 'rgba(16,185,129,0.24)', color: PALETTE.emerald, background: 'rgba(16,185,129,0.08)' }}>
                            {row.combinedScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div className="argus-card" style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))', borderColor: 'rgba(148,163,184,0.14)', padding: '1.75rem' }}>
                <div className="argus-card__row" style={{ marginBottom: 18 }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.text }}>
                    <ShieldAlert size={14} color={PALETTE.emerald} />
                    Common Objections
                  </div>
                  <span className="argus-badge" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', color: PALETTE.muted, background: 'rgba(148, 163, 184, 0.06)' }}>
                    Frequency by category
                  </span>
                </div>

                <SimpleBarChart data={objectionFrequency} height={260} />
              </div>

              <div className="argus-card" style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))', borderColor: 'rgba(148,163,184,0.14)', padding: '1.75rem' }}>
                <div className="argus-card__row" style={{ marginBottom: 18 }}>
                  <div className="argus-card__label" style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.text }}>
                    <ArrowUpRight size={14} color={PALETTE.emerald} />
                    Account Health Trend
                  </div>
                  <span className="argus-badge" style={{ borderColor: 'rgba(16,185,129,0.24)', color: PALETTE.emerald, background: 'rgba(16,185,129,0.08)' }}>
                    {dynamicTrendData.accountName} | Recent History
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <SimpleLineChart data={dynamicTrendData.data} height={280} />
                  <TooltipCard
                    title="Legend"
                    series={[
                      { label: 'MEDDIC Completeness', value: 'Emerald', color: PALETTE.emerald },
                      { label: 'Deal Risk Score', value: 'Rose', color: PALETTE.rose },
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </article>
  )
}