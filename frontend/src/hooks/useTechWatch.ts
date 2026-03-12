import { useQuery } from '@tanstack/react-query'
import { getTechWatchItems, getTechWatchFeed } from '@/services/techWatchService'
import type { TechWatchItemsResponse } from '@/interfaces/techWatch'

export const useTechWatchItems = (groupId: number, page = 1, enabled = true) => {
  return useQuery<TechWatchItemsResponse>({
    queryKey: ['tech-watch', groupId, page],
    queryFn: () => getTechWatchItems(groupId, page),
    enabled: !!groupId && enabled,
  })
}

export const useTechWatchFeed = (page = 1, enabled = true) => {
  return useQuery<TechWatchItemsResponse>({
    queryKey: ['tech-watch-feed', page],
    queryFn: () => getTechWatchFeed(page),
    enabled,
  })
}
