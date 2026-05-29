import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, LayoutDashboard, LogOut, ShieldAlert, Sparkles, Users } from 'lucide-react'
import FileUpload from './components/FileUpload.jsx'
import HistorySidebar from './components/HistorySidebar.jsx'
import LandingPage from './LandingPage.jsx'
import ManagerDashboard from './components/ManagerDashboard.jsx'
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

function getStoredRole() {
  if (typeof window === 'undefined') return 'REP'
  return window.localStorage.getItem('userRole') || 'REP'
}

function getStoredWorkspaceView() {
  if (typeof window === 'undefined') return 'rep'
  return window.localStorage.getItem('argus_workspace_view') || 'rep'
}

function App() {
  const [authToken, setAuthToken] = useState(getStoredToken)
  const [currentUserEmail, setCurrentUserEmail] = useState(getStoredEmail)
  const [userRole, setUserRole] = useState(getStoredRole)
  const [workspaceView, setWorkspaceView] = useState(getStoredWorkspaceView)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [pastedTranscript, setPastedTranscript] = useState('')
  const [analysis, setAnalysis] = useState(emptyAnalysis)
  const [activeTab, setActiveTab] = useState('meddic')
  const [meta, setMeta] = useState({ id: '—', sourceType: '—' })
  const [focusedQuote, setFocusedQuote] = useState('')
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('argus_workspace_view', workspaceView)
  }, [workspaceView])

  useEffect(() => {
    if (userRole !== 'MANAGER' && workspaceView === 'manager') {
      setWorkspaceView('rep')
    }
  }, [userRole, workspaceView])

  const highlightQuotes = useMemo(
    () => Object.values(analysis?.meddic?.elements || {})
      .map((element) => element?.quote)
      .filter((quote) => typeof quote === 'string' && quote.trim().length > 0),
    [analysis],
  )

  const handleAuthenticated = (token, role, email) => {
    setAuthToken(token)
    setCurrentUserEmail(email || '')
    setUserRole(role || 'REP')
    setError('')
    setTranscript('')
    setAnalysis(emptyAnalysis)
    setMeta({ id: '—', sourceType: '—' })
    setFocusedQuote('')
    setSelectedFile(null)
    setSelectedHistoryId('')
    setActiveTab('meddic')
    setHistoryRefreshKey((value) => value + 1)
    setWorkspaceView('rep')

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('argus_token', token)
      window.localStorage.setItem('argus_user_email', email || '')
      window.localStorage.setItem('userRole', role || 'REP')
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('argus_token')
      window.localStorage.removeItem('argus_user_email')
      window.localStorage.removeItem('userRole')
    }

    setAuthToken('')
    setCurrentUserEmail('')
    setUserRole('REP')
    setSelectedFile(null)
    setLoading(false)
    setError('')
    setTranscript('')
    setPastedTranscript('')
    setAnalysis(emptyAnalysis)
    setActiveTab('meddic')
    setMeta({ id: '—', sourceType: '—' })
    setFocusedQuote('')
    setSelectedHistoryId('')
    setWorkspaceView('rep')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Choose a .txt or .mp3 file first.')
      return
    }

    setLoading(true)
    setError('')

    const transcriptSource = pastedTranscript.trim() ? pastedTranscript : selectedFile

    if (!transcriptSource) {
      setError('Choose a .txt, .docx, .mp3, .wav file, or paste transcript text first.')
      setLoading(false)
      return
    }

    try {
      const payload = await analyzeTranscript(transcriptSource)
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
    setPastedTranscript('')
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
          <div className="argus-brand" style={{ alignItems: 'center', gap: 20 }}>
            <div
              className="argus-brand__logo"
              style={{
                width: 80,
                height: 80,
                background: 'transparent',
                boxShadow: 'none',
                border: 'none',
                borderRadius: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="Project Argus logo"
                className="argus-brand__image"
                style={{ width: 80, height: 80, mixBlendMode: 'screen' }}
              />
            </div>
            <div>
              <div className="argus-eyebrow" style={{ fontSize: 18, letterSpacing: '0.34em' }}>PROJECT ARGUS</div>
              <p className="argus-subtitle">
                Secure multi-tenant workspace for transcript analysis, coaching, and historical review.
              </p>
            </div>
          </div>

          <div className="argus-statusbar">
            <div className="argus-pill" style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}>
              <Activity size={16} />
              Backend: http://localhost:3001
            </div>
            <div className="argus-pill" style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}>
              <Sparkles size={16} />
              Result ID: {meta.id}
            </div>
            <div className="argus-pill" style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}>
              <CheckCircle2 size={16} />
              Source: {meta.sourceType}
            </div>
            <div className="argus-pill" style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}>
              <ShieldAlert size={16} />
              {currentUserEmail || 'Authenticated operative'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 4, borderRadius: 999, border: '1px solid rgba(148, 163, 184, 0.18)', background: 'rgba(15, 23, 42, 0.92)' }}>
              <button
                type="button"
                className="argus-button argus-button--ghost"
                onClick={() => setWorkspaceView('rep')}
                style={{ width: 'auto', minWidth: 130, padding: '10px 14px', borderRadius: 999, borderColor: workspaceView === 'rep' ? 'rgba(16, 185, 129, 0.32)' : 'transparent', background: workspaceView === 'rep' ? 'rgba(16, 185, 129, 0.12)' : 'transparent', color: workspaceView === 'rep' ? '#F8FAFC' : '#94A3B8' }}
              >
                <Users size={14} />
                Rep Workspace
              </button>
              {userRole === 'MANAGER' ? (
                <button
                  type="button"
                  className="argus-button argus-button--ghost"
                  onClick={() => setWorkspaceView('manager')}
                  style={{ width: 'auto', minWidth: 145, padding: '10px 14px', borderRadius: 999, borderColor: workspaceView === 'manager' ? 'rgba(16, 185, 129, 0.32)' : 'transparent', background: workspaceView === 'manager' ? 'rgba(16, 185, 129, 0.12)' : 'transparent', color: workspaceView === 'manager' ? '#F8FAFC' : '#94A3B8' }}
                >
                  <LayoutDashboard size={14} />
                  Manager Dashboard
                </button>
              ) : null}
            </div>
            <button type="button" className="argus-button argus-button--ghost argus-logout" onClick={handleLogout} style={{ width: 'auto' }}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {workspaceView === 'manager' ? (
          <main className="argus-dashboard__main">
            <ManagerDashboard />
          </main>
        ) : (
          <section className="argus-dashboard">
            <aside className="argus-dashboard__sidebar">
              <FileUpload
                onAnalyze={handleAnalyze}
                loading={loading}
                selectedFile={selectedFile}
                pastedTranscript={pastedTranscript}
                onFileChange={(file) => {
                  setSelectedFile(file)
                  if (file) {
                    setPastedTranscript('')
                  }
                  setError('')
                }}
                onPastedTranscriptChange={(value) => {
                  setPastedTranscript(value)
                  if (value.trim()) {
                    setSelectedFile(null)
                  }
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
        )}
      </div>
    </div>
  )
}

export default App
