'use client'

import { IdCard, MessageSquare } from 'lucide-react'

type CvSocialToggleProps = {
  activeMode: 'cv' | 'social'
  onToggle: (mode: 'cv' | 'social') => void
}

export default function CvSocialToggle({ activeMode, onToggle }: CvSocialToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
      <button
        type="button"
        onClick={() => onToggle('cv')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
          activeMode === 'cv'
            ? 'bg-card shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <IdCard className="h-4 w-4" />
        CV
      </button>
      <button
        type="button"
        onClick={() => onToggle('social')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
          activeMode === 'social'
            ? 'bg-card shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        Social
      </button>
    </div>
  )
}
