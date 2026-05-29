import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'

export default function FileUpload({ onAnalyze, loading, selectedFile, pastedTranscript, onFileChange, onPastedTranscriptChange }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const pickFile = (fileList) => {
    const file = fileList?.[0]
    if (!file) return
    onFileChange(file)
  }

  return (
    <section
      className={`argus-panel argus-upload ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        pickFile(event.dataTransfer.files)
      }}
    >
      <div className="argus-panel__header">
        <span>Ingestion</span>
        <span className="argus-panel__status">Click or Drop</span>
      </div>

      <div className="argus-dropzone" onClick={() => inputRef.current?.click()}>
        <div className="argus-dropzone__title">
          <Upload size={18} />
          <span>Drop transcript or audio</span>
        </div>
        <p>
          Accepts <strong>.txt</strong>, <strong>.docx</strong>, <strong>.mp3</strong>, and <strong>.wav</strong>. You can also paste transcript text below.
        </p>
        <div className="argus-file-name">{selectedFile ? selectedFile.name : 'No file selected yet'}</div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx,.mp3,.wav,text/plain,audio/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => pickFile(event.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      <label style={{ display: 'grid', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F8FAFC', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <FileText size={14} />
          Paste Transcript
        </span>
        <textarea
          value={pastedTranscript}
          onChange={(event) => onPastedTranscriptChange?.(event.target.value)}
          placeholder="Paste a speaker-labeled transcript here, for example: Rep: ... Customer: ..."
          rows={6}
          style={{
            width: '100%',
            resize: 'vertical',
            borderRadius: 16,
            border: '1px solid rgba(148,163,184,0.16)',
            background: 'rgba(15,23,42,0.94)',
            color: '#F8FAFC',
            padding: '0.9rem 1rem',
            lineHeight: 1.6,
            outline: 'none',
            boxShadow: 'none',
            font: 'inherit',
          }}
        />
      </label>

      <div className="argus-upload__actions">
        <button type="button" className="argus-button argus-button--primary" onClick={onAnalyze} disabled={loading}>
          {loading ? <span className="argus-spinner" /> : <Upload size={16} />}
          {loading ? 'Analyzing Call...' : 'Run Analysis'}
        </button>

        <button
          type="button"
          className="argus-button argus-button--ghost"
          onClick={() => onFileChange(null)}
        >
          Reset File
        </button>
      </div>
    </section>
  )
}