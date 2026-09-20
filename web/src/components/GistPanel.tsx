import { useState } from 'react'
import type { Diagram, Gists } from '../types/content'
import DiagramList from './DiagramList'

interface GistPanelProps {
  gists: Gists
  diagrams?: Diagram[]
}

const ALL_TABS = [
  { key: 'short' as const, label: 'Short', desc: 'Quick overview' },
  { key: 'quick' as const, label: '1 min', desc: 'Quick takeaway' },
  { key: 'medium' as const, label: '5 min', desc: 'Key points' },
  { key: 'full' as const, label: '10 min', desc: 'Full overview' },
  { key: 'long' as const, label: 'Full', desc: 'Complete content' },
] as const

type GistKey = keyof Gists
type TabKey = GistKey | 'diagrams'

const DEPTH_WITH_DIAGRAMS: GistKey[] = ['medium', 'full', 'long']

export default function GistPanel({ gists, diagrams = [] }: GistPanelProps) {
  const gistTabs = ALL_TABS.filter((t) => gists[t.key as GistKey])
  const hasDiagrams = diagrams.length > 0
  const [active, setActive] = useState<TabKey | null>(null)

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden mb-8">
      <div className="flex border-b border-stone-200 bg-stone-50">
        <div className="flex-1 flex">
          {gistTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(active === tab.key ? null : (tab.key as GistKey))}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors text-left sm:text-center ${
                active === tab.key
                  ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-500'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-stone-100'
              }`}
            >
              {tab.label}
              <span className="hidden sm:inline ml-1 text-xs font-normal opacity-60">{tab.desc}</span>
            </button>
          ))}
          {hasDiagrams && (
            <button
              onClick={() => setActive(active === 'diagrams' ? null : 'diagrams')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors text-left sm:text-center ${
                active === 'diagrams'
                  ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-500'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-stone-100'
              }`}
            >
              Diagrams
              <span className="hidden sm:inline ml-1 text-xs font-normal opacity-60">Visual map</span>
            </button>
          )}
        </div>
        {active && (
          <button
            onClick={() => setActive(null)}
            className="px-3 text-stone-300 hover:text-zinc-500 text-sm transition-colors"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {active ? (
        <div className="p-5 bg-stone-50/60">
          {active !== 'diagrams' && (
            <div
              className="prose-content text-sm"
              dangerouslySetInnerHTML={{ __html: gists[active] ?? '' }}
            />
          )}
          {hasDiagrams && (active === 'diagrams' || DEPTH_WITH_DIAGRAMS.includes(active as GistKey)) && (
            <div className={active === 'diagrams' ? '' : 'mt-5 pt-5 border-t border-stone-200'}>
              <DiagramList diagrams={diagrams} />
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-3 text-xs text-stone-400 bg-white">
          Select a reading level above to see an AI-generated summary
        </div>
      )}
    </div>
  )
}
