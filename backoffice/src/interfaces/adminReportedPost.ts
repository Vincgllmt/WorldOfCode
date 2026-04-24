export interface AdminReportedPost {
  postId: number
  postContent: string | null
  postAuthorUsername: string | null
  postAuthorAvatarUrl: string | null
  postTechGroupName: string | null
  reportCount: number
  pendingCount: number
  inProgressCount: number
  resolvedCount: number
  rejectedCount: number
  latestReportAt: string
}
