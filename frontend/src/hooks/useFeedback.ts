import { useMutation, useQuery } from '@tanstack/react-query'
import { submitFeedback, checkHasExistingFeedback } from '@/services/feedbackService'
import type { FeedbackPayload } from '@/interfaces/feedback'

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: FeedbackPayload) => submitFeedback(data),
  })
}

export function useHasExistingFeedback() {
  return useQuery({
    queryKey: ['feedback', 'has-existing'],
    queryFn: checkHasExistingFeedback,
  })
}
