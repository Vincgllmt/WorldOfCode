import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getGroupSuggestionsPaginated,
  GroupSuggestionsParams,
  claimGroupSuggestion,
  approveGroupSuggestion,
  rejectGroupSuggestion,
} from '@/services/groupSuggestionService'
import { ApproveSuggestionPayload, RejectSuggestionPayload } from '@/interfaces/groupSuggestion'

const QUERY_KEY = ['groupSuggestions']

export const useGroupSuggestions = (params: GroupSuggestionsParams) => {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => getGroupSuggestionsPaginated(params),
    placeholderData: (prev) => prev,
    refetchInterval: 30000,
  })
  return { suggestions: data?.items ?? [], total: data?.total ?? 0, isLoading, isFetching, error }
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
    mutationFn: ({ id, payload }: { id: number; payload: ApproveSuggestionPayload }) =>
      approveGroupSuggestion(id, payload),
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
