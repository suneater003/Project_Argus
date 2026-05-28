import { Activity, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'

const MEDDIC_FIELDS = [
  { key: 'metrics', label: 'Metrics' },
  { key: 'economic Buyer', label: 'Economic Buyer' },
  { key: 'decision Criteria', label: 'Decision Criteria' },
  { key: 'decision Process', label: 'Decision Process' },
  { key: 'identify Pain', label: 'Identify Pain' },
  { key: 'champion', label: 'Champion' },
]

function severityTone(severity) {
  const value = String(severity || 'medium').toLowerCase()
  if (value.includes('high') || value.includes('critical')) return 'high'
  if (value.includes('low')) return 'low'
  return 'medium'
}

export default function AnalysisBoard({ analysis, transcript, activeTab, setActiveTab }) {
  const objections = Array.isArray(analysis?.objectionsData) ? analysis.objectionsData : []
  const missingFields = MEDDIC_FIELDS.filter(({ key }) => {
    const value = analysis?.meddicData?.[key]
    return value == null || String(value).trim() === ''
  })

  return (
    <article className="argus-pane">
      <div className="argus-pane__header">
        <div className="argus-pane__title">
          <Activity size={18} />
          Extracted Analysis
        </div>
        <div className="argus-pill">
          <CheckCircle2 size={14} />
          {missingFields.length} gaps
        </div>
      </div>

      <div className="argus-tabs">
        <button type="button" className={`argus-tab ${activeTab === 'meddic' ? 'is-active' : ''}`} onClick={() => setActiveTab('meddic')}>
          <Sparkles size={14} />
          MEDDIC Analysis
        </button>
        <button type="button" className={`argus-tab ${activeTab === 'objections' ? 'is-active' : ''}`} onClick={() => setActiveTab('objections')}>
          <AlertTriangle size={14} />
          Objections Caught
        </button>
      </div>

      <div className="argus-tab-body">
        {activeTab === 'meddic' ? (
          <>
            <div className="argus-card">
              <div className="argus-card__head">
                <span>Qualification Coverage</span>
                <CheckCircle2 size={14} />
              </div>
              <p className="argus-card__note">
                Identified markers are shown as values; missing values are treated as gaps for coaching.
              </p>
            </div>

            {MEDDIC_FIELDS.map(({ key, label }) => {
              const value = analysis?.meddicData?.[key]
              const isMissing = value == null || String(value).trim() === ''
              return (
                <div key={key} className="argus-card">
                  <div className="argus-card__row">
                    <span className="argus-card__label">{label}</span>
                    <span className={`argus-badge ${isMissing ? 'is-warn' : 'is-good'}`}>
                      {isMissing ? 'Missing' : 'Captured'}
                    </span>
                  </div>
                  <div className={isMissing ? 'argus-card__gap' : 'argus-card__value'}>
                    {isMissing ? 'No supporting evidence found in the transcript.' : String(value)}
                  </div>
                </div>
              )
            })}

            <div className="argus-card">
              <div className="argus-card__row">
                <span className="argus-card__label">Coverage Gaps</span>
                <span className="argus-badge is-warn">{missingFields.length}</span>
              </div>
              <div className="argus-card__note">
                {missingFields.length ? missingFields.map((field) => field.label).join(' • ') : 'All MEDDIC fields were populated.'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="argus-card">
              <div className="argus-card__head">
                <span>Objection Inventory</span>
                <AlertTriangle size={14} />
              </div>
              <p className="argus-card__note">
                Each objection is ranked by severity so the rep can review the conversation pressure points.
              </p>
            </div>

            {objections.length ? (
              objections.map((item, index) => {
                const tone = severityTone(item?.severity)
                return (
                  <div key={`${item?.objection || 'objection'}-${index}`} className="argus-card">
                    <div className="argus-card__row">
                      <span className="argus-card__label">Objection {index + 1}</span>
                      <span className={`argus-badge is-${tone}`}>{item?.severity || 'medium'}</span>
                    </div>
                    <div className="argus-card__value">{item?.objection || 'No objection text provided.'}</div>
                  </div>
                )
              })
            ) : (
              <div className="argus-card">
                <div className="argus-card__row">
                  <span className="argus-card__label">No objections detected</span>
                  <span className="argus-badge is-good">Clear</span>
                </div>
                <div className="argus-card__note">The model did not return structured objection data for this call.</div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}