import { useQuery } from '@tanstack/react-query'
import { getAllAdminGroups } from '@/services/adminService'
import { useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/useGroups'

export const useAdminGroups = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminGroups'],
    queryFn: getAllAdminGroups,
  })
  return { groups: data ?? [], isLoading, error }
}

export { useCreateGroup, useUpdateGroup, useDeleteGroup }
