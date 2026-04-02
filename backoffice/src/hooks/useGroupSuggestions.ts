import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getGroupSuggestions,
  claimGroupSuggestion,
  approveGroupSuggestion,
  rejectGroupSuggestion,
} from '@/services/groupSuggestionService'
import { RejectSuggestionPayload } from '@/interfaces/groupSuggestion'

const QUERY_KEY = ['groupSuggestions']

export const useGroupSuggestions = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getGroupSuggestions,
    refetchInterval: 30000,
  })
  return { suggestions: data ?? [], isLoading, error }
}

export const useClaimSuggestion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => claimGroupSuggestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Suggestion prise en charge.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de prendre en charge cette suggestion.')
    },
  })
}

export const useApproveSuggestion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => approveGroupSuggestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Suggestion approuvée et groupe créé.')
    },
    onError: (error: Error) => {
      toast.error(error.message || "Impossible d'approuver cette suggestion.")
    },
  })
}

export const useRejectSuggestion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RejectSuggestionPayload }) =>
      rejectGroupSuggestion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Suggestion rejetée.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de rejeter cette suggestion.')
    },
  })
}
