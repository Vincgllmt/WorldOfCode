import { useQuery } from '@tanstack/react-query'
import { getTechWatchItems } from '@/services/techWatchService'
import type { TechWatchItemsResponse } from '@/interfaces/techWatch'

export const useTechWatchItems = (groupId: number, page = 1, enabled = true) => {
  return useQuery<TechWatchItemsResponse>({
    queryKey: ['tech-watch', groupId, page],
    queryFn: () => getTechWatchItems(groupId, page),
    enabled: !!groupId && enabled,
  })
}
