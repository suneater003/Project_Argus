import { DollarSign, FileText } from 'lucide-react'

export default function TranscriptPane({ transcript }) {
  return (
    <article className="argus-pane">
      <div className="argus-pane__header">
        <div className="argus-pane__title">
          <FileText size={18} />
          Raw Transcript
        </div>
        <div className="argus-pill">
          <DollarSign size={14} />
          Quote-ready viewer
        </div>
      </div>

      <div className="argus-transcript">
        {transcript ? (
          transcript
        ) : (
          <div className="argus-empty-state">
            <div className="argus-empty-state__title">No transcript loaded</div>
            <div>Upload a file to populate the transcript viewer and enable quote highlighting in the analysis tabs.</div>
          </div>
        )}
      </div>
    </article>
  )
}