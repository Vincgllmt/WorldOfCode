export interface AdminPostDetailComment {
  id: number
  content: string
  authorUsername: string
  createdAt: string
}

export interface AdminPostDetailReport {
  id: number
  reason: string | null
  status: string
  reportedByUsername: string
  createdAt: string
}

export interface AdminPostDetail {
  id: number
  content: string | null
  imageUrl: string | null
  createdAt: string
  authorId: number
  authorUsername: string
  authorAvatarUrl: string | null
  authorEmail: string
  techGroupName: string | null
  likesCount: number
  commentsCount: number
  reportsCount: number
  sharedFromId: number | null
  sharedFromExcerpt: string | null
  sharedFromAuthorUsername: string | null
  lastComments: AdminPostDetailComment[]
  reports: AdminPostDetailReport[]
}
