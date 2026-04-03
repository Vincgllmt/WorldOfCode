import { useQuery } from '@tanstack/react-query'
import { getAdminActivity } from '@/services/adminService'

export const useAdminActivity = (days: number) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminActivity', days],
    queryFn: () => getAdminActivity(days),
  })

  return { activity: data ?? [], isLoading, error }
}
