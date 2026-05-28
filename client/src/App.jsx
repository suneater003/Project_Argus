import { useState } from 'react'
import { Activity, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react'
import FileUpload from './components/FileUpload.jsx'
import TelemetryGrid from './components/TelemetryGrid.jsx'
import TranscriptPane from './components/TranscriptPane.jsx'
import AnalysisBoard from './components/AnalysisBoard.jsx'
import { analyzeTranscript } from './services/api.js'

const emptyAnalysis = {
  repName: 'Awaiting upload',
  accountName: 'No account loaded',
  dealStage: 'Unknown',
  overallRiskScore: 0,
  meddicCompleteness: 0,
  meddicData: {},
  objectionsData: [],
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState(emptyAnalysis)
  const [activeTab, setActiveTab] = useState('meddic')
  const [meta, setMeta] = useState({ id: '—', sourceType: '—' })

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
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Upload failed.')
    } finally {
      setLoading(false)
    }
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
                Upload a transcript or audio file to extract MEDDIC, risk, and coaching insights.
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
          </div>
        </header>

        <section className="argus-layout">
          <FileUpload
            onAnalyze={handleAnalyze}
            loading={loading}
            selectedFile={selectedFile}
            onFileChange={(file) => {
              setSelectedFile(file)
              setError('')
            }}
          />

          <main className="argus-main">
            <TelemetryGrid analysis={analysis} />

            <section className="argus-split">
              <TranscriptPane transcript={transcript} />
              <AnalysisBoard
                analysis={analysis}
                transcript={transcript}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
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
