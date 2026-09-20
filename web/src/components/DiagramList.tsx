import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'
import type { Diagram } from '../types/content'

let initialized = false

function ensureMermaid() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'Inter, sans-serif',
  })
  initialized = true
}

function MermaidBlock({ diagram, renderKey }: { diagram: Diagram; renderKey: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ensureMermaid()
    setSvg(null)
    setError(false)
    const id = `diagram-${rawId}-${renderKey}`
    mermaid
      .render(id, diagram.mermaid)
      .then(({ svg: next }) => {
        if (!cancelled) setSvg(next)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [diagram.mermaid, rawId, renderKey])

  return (
    <figure className="mt-4 first:mt-0">
      <figcaption className="text-sm font-medium text-zinc-700 mb-2">{diagram.title}</figcaption>
      {error ? (
        <p className="text-xs text-stone-400">Diagram could not be rendered.</p>
      ) : svg ? (
        <div
          className="overflow-x-auto bg-white rounded-lg border border-stone-200 p-3 mermaid-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="text-xs text-stone-400">Rendering diagram…</p>
      )}
      {diagram.caption ? (
        <p className="text-xs text-stone-400 mt-2">{diagram.caption}</p>
      ) : null}
    </figure>
  )
}

export default function DiagramList({ diagrams }: { diagrams: Diagram[] }) {
  if (diagrams.length === 0) return null
  return (
    <div className="space-y-4">
      {diagrams.map((diagram, i) => (
        <MermaidBlock key={`${diagram.title}-${i}`} diagram={diagram} renderKey={String(i)} />
      ))}
    </div>
  )
}
