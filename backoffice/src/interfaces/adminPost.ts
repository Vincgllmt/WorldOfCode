export interface AdminPostListItem {
  id: number
  excerpt: string | null
  authorUsername: string
  techGroupName: string | null
  likesCount: number
  commentsCount: number
  reportsCount: number
  createdAt: string  // ISO 8601
}
