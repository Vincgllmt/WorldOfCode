import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import toast from 'react-hot-toast'
import type { Visibility } from '@/interfaces/user'

export function useUpdateExperienceVisibility(expId: string, userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (visibility: Visibility) => {
      const res = await fetchWithAuth(`/experiences/${expId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
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
