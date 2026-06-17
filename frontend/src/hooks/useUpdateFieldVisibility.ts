import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import toast from 'react-hot-toast'
import type { Visibility, User } from '@/interfaces/user'

export function useUpdateFieldVisibility(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patch: Record<string, Visibility>) => {
      const current = queryClient.getQueryData<User>(['user', userId])
      const merged = { ...(current?.fieldVisibility ?? {}), ...patch }
      const res = await fetchWithAuth(`/api/user/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldVisibility: merged }),
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour de la visibilité')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la visibilité')
    },
  })
}
