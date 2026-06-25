import { useQuery } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { EngagementSummary } from '@/interfaces/user'

export function useEngagementSummary(userId: number) {
  return useQuery({
    queryKey: ['engagement-summary', userId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/user/${userId}/engagement-summary`)
      if (!res.ok) throw new Error('Failed to fetch engagement summary')
      return res.json() as Promise<EngagementSummary>
    },
  })
}
