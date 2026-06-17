import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type ShareLinkResponse = {
  token: string
}

export function useShareCvLink(userId: number, initialToken?: string | null) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(initialToken ?? null)

  const { mutate: generateLink, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(`/api/user/${userId}/cv/share-link`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Impossible de générer le lien')
      return res.json() as Promise<ShareLinkResponse>
    },
    onSuccess: (data) => {
      setToken(data.token)
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })

  const url =
    token
      ? typeof window !== 'undefined'
        ? `${window.location.origin}/cv/${token}`
        : `/cv/${token}`
      : null

  return { token, url, generateLink, isGenerating }
}
