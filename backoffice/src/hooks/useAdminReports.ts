import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminReports,
  claimReport,
  resolveReport,
  rejectReport,
} from '@/services/reportService'

export const useAdminReports = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminReports'],
    queryFn: getAdminReports,
    refetchInterval: 30000,
  })
  return { reports: data ?? [], isLoading, error }
}

export const useClaimReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => claimReport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminReports'] }),
  })
}

export const useResolveReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: number; resolutionNote?: string }) =>
      resolveReport(id, resolutionNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminReports'] }),
  })
}

export const useRejectReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: number; resolutionNote: string }) =>
      rejectReport(id, resolutionNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminReports'] }),
  })
}
