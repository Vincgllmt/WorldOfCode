export interface AdminPostSummary {
  id: number
  excerpt: string | null
  createdAt: string  // ISO 8601
  likesCount: number
  commentsCount: number
}

export interface AdminUserDetail {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  creationDate: string  // ISO 8601
  avatarUrl: string | null
  bio: string | null
  location: string | null
  availability: string | null
  experiences: Array<{
    title: string
    company: string
    startDate: string  // 'YYYY-MM'
    endDate: string | null
    description: string
  }> | null
  skills: Array<{ id: number; name: string; category: string }>
  links: Array<{ id: number; type: string; url: string }>
  lastFivePosts: AdminPostSummary[]
  reportCountOnPosts: number
  isBanned: boolean
  bannedAt: string | null
  bannedReason: string | null
}
