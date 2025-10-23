export interface Post {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  authorId: number
  authorUsername: string
  techGroupId: number
  techGroupName: string

  likesCount?: number
  likedByMe?: boolean
  sharesCount?: number

  repostOfId?: number
  sharedPostId?: number
  originalPostId?: number
  repostOf?: Post
  sharedPost?: Post
  originalPost?: Post
  isAuthorFollowedByMe?: boolean
}

export interface CreatePostPayload {
  content: string
  groupId: number
}

export interface UpdatePostPayload {
  content: string
  groupId: number
}

export interface Liker {
  id: number
  username: string
  avatarUrl?: string | null
}
