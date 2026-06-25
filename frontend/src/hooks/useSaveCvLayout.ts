import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { CvLayout } from '@/interfaces/user'

type CvLayoutPayload = {
  cvLayout?: CvLayout
  cvAccentColor?: string | null
}

export function useSaveCvLayout(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CvLayoutPayload) => {
      const res = await fetchWithAuth(`/user/${userId}/cv/layout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Impossible de sauvegarder la mise en page')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}
