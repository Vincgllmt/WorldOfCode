import { useMutation } from '@tanstack/react-query'
import { reportPost } from '@/services/reportService'

export function useReportPost() {
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: number; reason: string }) =>
      reportPost(postId, reason),
  })
}
