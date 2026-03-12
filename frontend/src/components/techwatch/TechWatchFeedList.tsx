'use client'

import { useState } from 'react'
import { useTechWatchFeed } from '@/hooks/useTechWatch'
import TechWatchCard from './TechWatchCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function TechWatchFeedList() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useTechWatchFeed(page)

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
        Erreur lors du chargement des actualités.
      </p>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucune actualité pour le moment. Rejoignez des groupes pour voir leurs actualités ici.
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
            Précédent
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
