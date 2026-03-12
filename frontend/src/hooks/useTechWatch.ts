import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
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

export const useInfiniteTechWatchFeed = (limit = 20) => {
  return useInfiniteQuery<TechWatchItemsResponse>({
    queryKey: ['tech-watch-feed-infinite'],
    queryFn: ({ pageParam }) => getTechWatchFeed(pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalItems / lastPage.limit)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
  })
}

export const useInfiniteTechWatchItems = (groupId: number, limit = 20) => {
  return useInfiniteQuery<TechWatchItemsResponse>({
    queryKey: ['tech-watch-infinite', groupId],
    queryFn: ({ pageParam }) => getTechWatchItems(groupId, pageParam as number, limit),
    initialPageParam: 1,
    enabled: !!groupId,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalItems / lastPage.limit)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
  })
}
