import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminFeedbacks, updateFeedbackStatus } from '@/services/feedbackService'

export const useAdminFeedbacks = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['adminFeedbacks'],
    queryFn: getAdminFeedbacks,
  })
  return { feedbacks: data, isLoading, error: error ? 'Erreur lors du chargement des feedbacks.' : null }
}

export const useUpdateFeedbackStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'new' | 'read' | 'processed' }) =>
      updateFeedbackStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminFeedbacks'] })
      qc.invalidateQueries({ queryKey: ['adminStats'] })
    },
  })
}
