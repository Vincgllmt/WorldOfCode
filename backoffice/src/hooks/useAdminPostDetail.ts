import { useQuery } from '@tanstack/react-query'
import { getAdminPostDetail } from '@/services/adminService'

export const useAdminPostDetail = (id: number | null) => {
  const { data, isLoading } = useQuery({
    queryKey: ['adminPostDetail', id],
    queryFn: () => getAdminPostDetail(id!),
    enabled: id !== null,
  })
  return { postDetail: data ?? null, isLoading }
}
