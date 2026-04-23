import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminReportsPaginated,
  AdminReportsParams,
  claimReport,
  resolveReport,
  rejectReport,
} from '@/services/reportService'

export const useAdminReports = (params: AdminReportsParams) => {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['adminReports', params],
    queryFn: () => getAdminReportsPaginated(params),
    placeholderData: (prev) => prev,
    refetchInterval: 30000,
  })
  return { reports: data?.items ?? [], total: data?.total ?? 0, isLoading, isFetching, error }
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
