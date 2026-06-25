import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import toast from 'react-hot-toast'
import type { ProfileHighlight } from '@/interfaces/user'

export function useHighlights(userId: number) {
  return useQuery<ProfileHighlight[]>({
    queryKey: ['highlights', userId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/user/${userId}/highlights`)
      if (!res.ok) throw new Error('Failed to fetch highlights')
      return res.json()
    },
  })
}

export function usePinPost(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetchWithAuth(`/posts/${postId}/pin-to-profile`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Impossible d\'épingler ce post')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', userId] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useUnpinPost(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetchWithAuth(`/posts/${postId}/pin-to-profile`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Impossible de désépingler ce post')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', userId] })
    },
    onError: () => {
      toast.error('Impossible de désépingler ce post')
    },
  })
}
