import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { Experience, User } from '@/interfaces/user'

export function useReorderExperiences(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetchWithAuth(`/api/user/${userId}/experiences/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: orderedIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
    },
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['user', userId] })
      const previous = queryClient.getQueryData<User>(['user', userId])
      queryClient.setQueryData<User>(['user', userId], (old) => {
        if (!old) return old
        const experienceMap = new Map<string, Experience>(
          (old.experiences ?? []).map((e) => [e.id, e])
        )
        const reordered = orderedIds
          .map((id, index) => {
            const exp = experienceMap.get(id)
            return exp ? { ...exp, position: index + 1 } : null
          })
          .filter((e): e is Experience => e !== null)
        return { ...old, experiences: reordered }
      })
      return { previous }
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user', userId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}
