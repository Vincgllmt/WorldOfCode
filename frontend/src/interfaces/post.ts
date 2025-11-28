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

export interface PostFormValues {
  readonly content: string
  readonly groupId: number
}

export type CreatePostPayload = PostFormValues

export type UpdatePostPayload = PostFormValues

export interface Liker {
  id: number
  username: string
  avatarUrl?: string | null
}

export interface UploadImageResponse {
  readonly url: string
}
