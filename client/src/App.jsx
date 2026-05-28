import { useMemo, useState } from 'react'
import { Activity, CheckCircle2, LogOut, ShieldAlert, Sparkles } from 'lucide-react'
import FileUpload from './components/FileUpload.jsx'
import HistorySidebar from './components/HistorySidebar.jsx'
import LandingPage from './LandingPage.jsx'
import TelemetryGrid from './components/TelemetryGrid.jsx'
import TranscriptPane from './components/TranscriptPane.jsx'
import AnalysisBoard from './components/AnalysisBoard.jsx'
import { analyzeTranscript } from './services/api.js'

const emptyAnalysis = {
  accountIntel: {
    repName: 'Awaiting upload',
    accountName: 'No account loaded',
    dealStageAssessment: 'Unknown',
  },
  meddic: {
    completenessScore: 0,
    elements: {},
  },
  objectionAnalysis: {
    overallHandlingScore: 0,
    objections: [],
  },
  dealIntelligence: {
    riskScore: 0,
    riskFactors: [],
    buyingSignals: [],
    nextActions: [],
    competitorMentions: [],
  },
  repCoaching: {
    estimatedTalkRatio: '—',
    questionQuality: {
      openEndedExamples: [],
      closedExamples: [],
    },
    top3CoachingPoints: [],
  },
}

function getStoredToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('argus_token') || ''
}

function getStoredEmail() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('argus_user_email') || ''
}

function App() {
  const [authToken, setAuthToken] = useState(getStoredToken)
  const [currentUserEmail, setCurrentUserEmail] = useState(getStoredEmail)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState(emptyAnalysis)
  const [activeTab, setActiveTab] = useState('meddic')
  const [meta, setMeta] = useState({ id: '—', sourceType: '—' })
  const [focusedQuote, setFocusedQuote] = useState('')
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const highlightQuotes = useMemo(
    () => Object.values(analysis?.meddic?.elements || {})
      .map((element) => element?.quote)
      .filter((quote) => typeof quote === 'string' && quote.trim().length > 0),
    [analysis],
  )

  const handleAuthenticated = (token, user) => {
    setAuthToken(token)
    setCurrentUserEmail(user?.email || '')
    setError('')
    setTranscript('')
    setAnalysis(emptyAnalysis)
    setMeta({ id: '—', sourceType: '—' })
    setFocusedQuote('')
    setSelectedFile(null)
    setSelectedHistoryId('')
    setActiveTab('meddic')
    setHistoryRefreshKey((value) => value + 1)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('argus_token', token)
      window.localStorage.setItem('argus_user_email', user?.email || '')
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('argus_token')
      window.localStorage.removeItem('argus_user_email')
    }

    setAuthToken('')
    setCurrentUserEmail('')
    setSelectedFile(null)
    setLoading(false)
    setError('')
    setTranscript('')
    setAnalysis(emptyAnalysis)
    setActiveTab('meddic')
    setMeta({ id: '—', sourceType: '—' })
    setFocusedQuote('')
    setSelectedHistoryId('')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Choose a .txt or .mp3 file first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = await analyzeTranscript(selectedFile)
      setTranscript(payload.transcript || '')
      setAnalysis(payload.data || emptyAnalysis)
      setMeta({ id: payload.id || '—', sourceType: payload.sourceType || '—' })
      setActiveTab('meddic')
      setFocusedQuote('')
      setSelectedHistoryId(payload.id || '')
      setHistoryRefreshKey((value) => value + 1)
    } catch (err) {
      if (err?.status === 401) {
        handleLogout()
        setError('Session expired. Please sign in again.')
        return
      }

      setError(err?.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleHistorySelect = (item) => {
    setSelectedHistoryId(item.id)
    setTranscript(item.transcript || '')
    setAnalysis(item.analysisData || emptyAnalysis)
    setMeta({ id: item.id || '—', sourceType: 'history' })
    setActiveTab('meddic')
    setFocusedQuote('')
    setError('')
  }

  if (!authToken) {
    return <LandingPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="argus-shell">
      <div className="argus-frame">
        <header className="argus-header">
          <div className="argus-brand">
            <div className="argus-brand__logo">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="argus-eyebrow">Project Argus</div>
              <h1 className="argus-title">Sales Call Intelligence Command Center</h1>
              <p className="argus-subtitle">
                Secure multi-tenant workspace for transcript analysis, coaching, and historical review.
              </p>
            </div>
          </div>

          <div className="argus-statusbar">
            <div className="argus-pill">
              <Activity size={16} />
              Backend: http://localhost:3001
            </div>
            <div className="argus-pill">
              <Sparkles size={16} />
              Result ID: {meta.id}
            </div>
            <div className="argus-pill">
              <CheckCircle2 size={16} />
              Source: {meta.sourceType}
            </div>
            <div className="argus-pill">
              <ShieldAlert size={16} />
              {currentUserEmail || 'Authenticated operative'}
            </div>
            <button type="button" className="argus-button argus-button--ghost argus-logout" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <section className="argus-dashboard">
          <aside className="argus-dashboard__sidebar">
            <FileUpload
              onAnalyze={handleAnalyze}
              loading={loading}
              selectedFile={selectedFile}
              onFileChange={(file) => {
                setSelectedFile(file)
                setError('')
              }}
            />

            <HistorySidebar
              selectedId={selectedHistoryId}
              refreshKey={historyRefreshKey}
              onSelectItem={handleHistorySelect}
              onSessionExpired={handleLogout}
              onRefresh={() => setHistoryRefreshKey((value) => value + 1)}
            />
          </aside>

          <main className="argus-dashboard__main">
            <TelemetryGrid analysisData={analysis} />

            <section className="argus-split">
              <TranscriptPane
                transcript={transcript}
                highlightQuotes={highlightQuotes}
                focusedQuote={focusedQuote}
              />
              <AnalysisBoard
                analysisData={analysis}
                transcript={transcript}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onQuoteSelect={setFocusedQuote}
              />
            </section>

            {error ? <div className="argus-error">{error}</div> : null}
          </main>
        </section>
      </div>
    </div>
  )
}

export default App
