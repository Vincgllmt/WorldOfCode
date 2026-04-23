import { fetchWithAuth } from '@/lib/fetchWithAuth'

export async function reportPost(postId: number, reason: string): Promise<void> {
  const res = await fetchWithAuth(`/report/post/${postId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 400 && data.error === 'Already reported') {
      throw new Error('Vous avez déjà signalé cette publication.')
    }
    throw new Error(data.error || 'Erreur lors du signalement')
  }
}
