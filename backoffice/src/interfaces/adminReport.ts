export type ReportStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'

export interface AdminReport {
  id: number
  postId: number | null
  postExcerpt: string | null
  postContent: string | null
  postAuthorUsername: string | null
  postAuthorId: number | null
  postTechGroupName: string | null
  postLikesCount: number | null
  postCommentsCount: number | null
  reportedByUsername: string
  reason: string | null
  createdAt: string        // ISO 8601
  status: ReportStatus
  claimedByUsername: string | null
  claimedAt: string | null
  resolvedByUsername: string | null
  resolvedAt: string | null
  resolutionNote: string | null
}
