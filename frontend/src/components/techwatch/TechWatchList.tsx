'use client'

import { useState } from 'react'
import { useTechWatchItems } from '@/hooks/useTechWatch'
import TechWatchCard from './TechWatchCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface Props {
  readonly groupId: number
}

export default function TechWatchList({ groupId }: Props) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useTechWatchItems(groupId, page)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-center text-red-500">
        Erreur lors du chargement de la veille tech.
      </p>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucun article de veille tech pour le moment.
      </p>
    )
  }

  const totalPages = Math.ceil(data.totalItems / data.limit)

  return (
    <div className="space-y-4">
      {data.items.map((item) => (
        <TechWatchCard key={item.id} item={item} />
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Precedent
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
