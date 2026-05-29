import { useEffect, useMemo, useRef } from 'react'
import { DollarSign, FileText } from 'lucide-react'

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueSortedQuotes(quotes) {
  return Array.from(
    new Set(
      (quotes || [])
        .map((quote) => String(quote || '').trim())
        .filter((quote) => quote.length > 0),
    ),
  ).sort((a, b) => b.length - a.length)
}

export default function TranscriptPane({ transcript, highlightQuotes = [], focusedQuote = '' }) {
  const scrollRef = useRef(null)

  const quotes = useMemo(() => uniqueSortedQuotes(highlightQuotes), [highlightQuotes])
  const focus = useMemo(() => String(focusedQuote || '').trim(), [focusedQuote])

  const renderedTranscript = useMemo(() => {
    if (!transcript) return null
    if (!quotes.length) return transcript

    const segments = []
    let cursor = 0

    while (cursor < transcript.length) {
      let bestMatch = null

      for (const quote of quotes) {
        const index = transcript.indexOf(quote, cursor)
        if (index === -1) continue
        if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && quote.length > bestMatch.quote.length)) {
          bestMatch = { index, quote }
        }
      }

      if (!bestMatch) {
        segments.push(transcript.slice(cursor))
        break
      }

      if (bestMatch.index > cursor) {
        segments.push(transcript.slice(cursor, bestMatch.index))
      }

      segments.push(bestMatch.quote)
      cursor = bestMatch.index + bestMatch.quote.length
    }

    return { segments }
  }, [quotes, transcript])

  useEffect(() => {
    if (!focus || !scrollRef.current) return

    const target = Array.from(scrollRef.current.querySelectorAll('[data-quote]')).find(
      (node) => node.getAttribute('data-quote') === focus,
    )
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focus, renderedTranscript])

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

      <div className="argus-transcript" ref={scrollRef}>
        {transcript ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {Array.isArray(renderedTranscript)
              ? renderedTranscript
              : renderedTranscript?.segments?.map((segment, index) => {
                  const isHighlight = quotes.includes(segment)
                  const isFocused = focus && segment === focus
                  if (!isHighlight) return <span key={index}>{segment}</span>

                  return (
                    <mark
                      key={index}
                      data-quote={segment}
                      style={{
                        background: isFocused ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.12)',
                        color: '#F8FAFC',
                        border: isFocused ? '1px solid rgba(16,185,129,0.55)' : '1px solid rgba(148, 163, 184, 0.24)',
                        borderRadius: 6,
                        padding: '0 4px',
                        boxShadow: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {segment}
                    </mark>
                  )
                })}
          </div>
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
