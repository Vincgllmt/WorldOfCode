import { useQuery } from '@tanstack/react-query'
import { getAdminStats } from '@/services/adminService'

export const useAdminStats = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats,
    refetchInterval: 30000, // polling 30s — coordination multi-admin
  })

  return {
    stats: data,
    isLoading,
    error,
  }
}
