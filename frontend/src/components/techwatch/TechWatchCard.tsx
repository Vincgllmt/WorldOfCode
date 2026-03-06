'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TechWatchItem } from '@/interfaces/techWatch'

interface Props {
  readonly item: TechWatchItem
}

export default function TechWatchCard({ item }: Props) {
  const formattedDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Card className="border border-border/70 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs">
            {item.sourceName}
          </Badge>
          {formattedDate && (
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          )}
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold hover:underline"
        >
          {item.title}
        </a>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.description}
          </p>
        )}
      </div>
    </Card>
  )
}
