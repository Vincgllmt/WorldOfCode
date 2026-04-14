'use client'

import RequestTypeBadge from './RequestTypeBadge'
import type { MentoringRequest } from '@/types/mentoring'

interface Props {
  request: MentoringRequest
  isSelected: boolean
  onClick: () => void
  onRefetch: () => void
}

export default function MentoringRequestCard({ request, isSelected, onClick }: Props) {
  return (
    <article
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar junior */}
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {request.junior.username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{request.junior.username}</p>
            <h3 className="font-medium text-sm leading-tight">{request.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RequestTypeBadge type={request.type} />
          <span className="text-xs font-semibold text-primary">{request.compatibilityScore}%</span>
        </div>
      </div>

      {/* Extrait description */}
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {request.descriptionExcerpt ?? request.description}
      </p>

      {/* Tags + état épinglé */}
      <div className="mt-3 flex items-center justify-between">
        <span className="px-2 py-0.5 bg-muted text-xs rounded-full">{request.techStack}</span>
        {request.pin?.isActive && (
          <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <span aria-hidden="true">📌</span> Épinglée
          </span>
        )}
      </div>
    </article>
  )
}
