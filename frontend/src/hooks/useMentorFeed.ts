'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMentorFeed } from '@/lib/api/mentoring/requests'
import type { MentoringRequest } from '@/types/mentoring'

interface FeedMeta { page: number; limit: number; total: number }

export function useMentorFeed(techStack?: string) {
  const [data, setData] = useState<MentoringRequest[]>([])
  const [meta, setMeta] = useState<FeedMeta>({ page: 1, limit: 20, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeed = useCallback(async () => {
    try {
      const result = await getMentorFeed({ techStack })
      setData(result.data)
      setMeta(result.meta)
      setError(null)
    } catch {
      setError('Impossible de charger le feed')
    } finally {
      setIsLoading(false)
    }
  }, [techStack])

  useEffect(() => {
    setIsLoading(true)
    fetchFeed()
    const interval = setInterval(fetchFeed, 30_000)
    return () => clearInterval(interval)
  }, [fetchFeed])

  return { data, meta, isLoading, error, refetch: fetchFeed }
}
