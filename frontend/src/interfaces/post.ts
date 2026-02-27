export interface Post {
  readonly id: number
  readonly content: string | null
  readonly createdAt: string
  readonly updatedAt: string | null
  readonly authorId: number
  readonly authorUsername: string
  readonly authorAvatarUrl?: string | null
  readonly techGroupId: number
  readonly techGroupName: string
  readonly likesCount: number
  readonly likedByUser: boolean
  readonly sharedCount: number
  readonly sharedPost?: Post | null
  readonly likedByMe?: boolean 
  readonly isAuthorFollowedByMe?: boolean
}

export interface SharePostPayload {
  readonly content?: string | null
  readonly groupId?: number
}

export interface PostFormValues {
  readonly content: string
  readonly groupId: number
}

export type CreatePostPayload = PostFormValues

export interface UpdatePostPayload {
  readonly content: string | null
  readonly groupId: number
}

export interface Liker {
  id: number
  username: string
  avatarUrl?: string | null
}

export interface UploadImageResponse {
  readonly url: string
}
