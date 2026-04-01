import { useQuery } from '@tanstack/react-query'
import { getAdminRecentActivity } from '@/services/adminService'

export const useAdminRecentActivity = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminRecentActivity'],
    queryFn: getAdminRecentActivity,
    refetchInterval: 30000, // polling 30s — cohérent avec useAdminStats
  })

  return { events: data ?? [], isLoading, error }
}
