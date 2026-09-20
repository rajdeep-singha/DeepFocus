export interface Diagram {
  title: string
  caption?: string
  mermaid: string
}

/** JSON field inserted into gist-generation prompt objects. */
export const DIAGRAM_JSON_FIELD = `"diagrams": [
    {
      "title": "<short diagram title>",
      "caption": "<one sentence of what to notice, or empty string>",
      "mermaid": "<valid mermaid source. Prefer flowchart TD/LR, sequenceDiagram, or timeline. Use \\\\n for newlines. No markdown fences.>"
    }
  ]`

export const DIAGRAM_RULES = `Diagrams explain structure the summaries cannot. Rules:
- Return 0 diagrams if the piece is purely narrative or opinion with no process, architecture, or causal chain
- Return 1 diagram for most pieces; 2 only if they show different views (e.g. architecture + sequence)
- Node IDs must be alphanumeric (no spaces). Put labels in quotes or brackets
- Do not invent facts that are not in the source
- Never wrap mermaid in triple backticks`

export function normalizeDiagrams(raw: unknown): Diagram[] {
  if (!Array.isArray(raw)) return []
  const out: Diagram[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const mermaid = typeof obj['mermaid'] === 'string' ? stripFences(obj['mermaid']).trim() : ''
    const title = typeof obj['title'] === 'string' ? obj['title'].trim() : ''
    if (!mermaid || !title) continue
    const caption = typeof obj['caption'] === 'string' ? obj['caption'].trim() : ''
    out.push(caption ? { title, caption, mermaid } : { title, mermaid })
    if (out.length >= 2) break
  }
  return out
}

export function diagramsToYamlLines(diagrams: Diagram[]): string[] {
  if (diagrams.length === 0) return []
  const lines = ['diagrams:']
  for (const d of diagrams) {
    lines.push(`  - title: ${JSON.stringify(d.title)}`)
    if (d.caption) lines.push(`    caption: ${JSON.stringify(d.caption)}`)
    lines.push(`    mermaid: ${JSON.stringify(d.mermaid)}`)
  }
  return lines
}

function stripFences(src: string): string {
  return src.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/, '')
}
