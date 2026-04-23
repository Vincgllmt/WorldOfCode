export interface AdminGroupDetailMember {
  id: number
  username: string
  avatarUrl: string | null
}

export interface AdminGroupDetailPost {
  id: number
  excerpt: string | null
  authorUsername: string
  createdAt: string
  likesCount: number
  commentsCount: number
}

export interface AdminGroupDetail {
  id: number
  name: string
  description: string | null
  createdAt: string
  creatorUsername: string | null
  creatorAvatarUrl: string | null
  rssFeedUrl: string | null
  memberCount: number
  postCount: number
  members: AdminGroupDetailMember[]
  recentPosts: AdminGroupDetailPost[]
}
