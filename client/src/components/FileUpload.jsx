import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

export default function FileUpload({ onAnalyze, loading, selectedFile, onFileChange }) {
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
          Accepts <strong>.txt</strong> and <strong>.mp3</strong>. Audio is transcribed before analysis.
        </p>
        <div className="argus-file-name">{selectedFile ? selectedFile.name : 'No file selected yet'}</div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.mp3,audio/*,text/plain"
          onChange={(event) => pickFile(event.target.files)}
          style={{ display: 'none' }}
        />
      </div>

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