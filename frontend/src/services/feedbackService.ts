import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { FeedbackPayload } from '@/interfaces/feedback'

export const checkHasExistingFeedback = async (): Promise<{ hasExisting: boolean }> => {
  const res = await fetchWithAuth('/feedback/mine')
  if (!res.ok) throw new Error('Erreur lors de la verification')
  return res.json()
}

export const submitFeedback = async (data: FeedbackPayload): Promise<{ success: boolean; message: string }> => {
  const res = await fetchWithAuth('/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erreur lors de l\'envoi du feedback')
  }

  return res.json()
}
