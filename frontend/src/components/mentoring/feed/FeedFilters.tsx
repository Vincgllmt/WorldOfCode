'use client'

import type { MentoringRequest } from '@/types/mentoring'

interface Props {
  requests: MentoringRequest[]
  selected: string | undefined
  onSelect: (tech: string | undefined) => void
}

export default function FeedFilters({ requests, selected, onSelect }: Props) {
  const techStacks = [...new Set(requests.map(r => r.techStack))]
  const urgentCount = requests.filter(r => {
    if (!r.blockedSince) return false
    return r.blockedSince.includes('semaine') || r.blockedSince.includes('mois')
  }).length

  const tabs: { key: string | undefined; label: string; count: number }[] = [
    { key: undefined, label: 'Toutes', count: requests.length },
    ...techStacks.map(t => ({ key: t, label: t, count: requests.filter(r => r.techStack === t).length })),
    ...(urgentCount > 0 ? [{ key: 'urgent', label: 'Urgent', count: urgentCount }] : []),
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.key ?? 'all'}
          onClick={() => onSelect(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            selected === tab.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {tab.label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            selected === tab.key ? 'bg-white/20' : 'bg-background'
          }`}>{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
