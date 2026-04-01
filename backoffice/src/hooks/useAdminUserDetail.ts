import { useQuery } from '@tanstack/react-query'
import { getAdminUserDetail } from '@/services/adminService'

export const useAdminUserDetail = (userId: number | null) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: () => getAdminUserDetail(userId!),
    enabled: !!userId,
  })
  return { userDetail: data ?? null, isLoading, error }
}
