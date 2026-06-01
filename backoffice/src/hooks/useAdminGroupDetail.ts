import { useQuery } from '@tanstack/react-query'
import { adminGroupService } from '@/services/adminGroupService'

export function useAdminGroupDetail(id: number | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-group-detail', id],
    queryFn: () => adminGroupService.getGroupDetail(id!),
    enabled: id !== null,
  })
  return { groupDetail: data ?? null, isLoading }
}
