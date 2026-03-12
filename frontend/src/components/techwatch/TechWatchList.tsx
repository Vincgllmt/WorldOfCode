'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useInfiniteTechWatchItems } from '@/hooks/useTechWatch'
import TechWatchCard from './TechWatchCard'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  readonly groupId: number
}

export default function TechWatchList({ groupId }: Props) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTechWatchItems(groupId)

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const allItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? []
  }, [data])

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

  if (allItems.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucun article de veille tech pour le moment.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {allItems.map((item) => (
        <TechWatchCard key={item.id} item={item} />
      ))}

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4" aria-live="polite">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
              Chargement...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
