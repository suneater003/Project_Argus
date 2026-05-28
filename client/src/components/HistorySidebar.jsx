import { useEffect, useState } from 'react'
import { Clock3, LoaderCircle, RotateCw, ShieldAlert } from 'lucide-react'
import { fetchHistory } from '../services/api.js'

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HistorySidebar({ selectedId, onSelectItem, refreshKey = 0, onSessionExpired, onRefresh }) {
  const [items, setItems] = useState([])
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
        setItems(payload.items || [])
      } catch (err) {
        if (!active) return
        if (err.status === 401) {
          onSessionExpired?.()
          return
        }
        setError(err.message || 'Unable to load history.')
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
  }, [onSessionExpired, refreshKey])

  return (
    <aside className="argus-history">
      <div className="argus-history__head">
        <div>
          <div className="argus-history__eyebrow">Call Vault</div>
          <h2>History</h2>
        </div>
        <button type="button" className="argus-button argus-button--ghost argus-history__refresh" onClick={onRefresh}>
          <RotateCw size={14} />
          Refresh
        </button>
      </div>

      <div className="argus-history__body">
        {loading ? (
          <div className="argus-history__state">
            <LoaderCircle size={18} className="argus-history__spinner" />
            Loading your secured history...
          </div>
        ) : error ? (
          <div className="argus-error">{error}</div>
        ) : items.length ? (
          items.map((item) => {
            const active = item.id === selectedId
            return (
              <button
                key={item.id}
                type="button"
                className={`argus-history__item ${active ? 'is-active' : ''}`}
                onClick={() => onSelectItem?.(item)}
              >
                <div className="argus-history__item-top">
                  <div>
                    <div className="argus-history__account">{item.accountName || 'Unknown Account'}</div>
                    <div className="argus-history__meta">{item.dealStage || 'Unknown stage'}</div>
                  </div>
                  <span className="argus-history__risk">{Math.round(item.overallRiskScore || 0)}/10</span>
                </div>
                <div className="argus-history__item-bottom">
                  <span>
                    <ShieldAlert size={12} />
                    MEDDIC {Math.round(item.meddicCompleteness || 0)}%
                  </span>
                  <span>
                    <Clock3 size={12} />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </button>
            )
          })
        ) : (
          <div className="argus-history__state">
            <div className="argus-empty-state__title">No saved calls yet</div>
            Upload a transcript or audio file to start building your history.
          </div>
        )}
      </div>
    </aside>
  )
}
