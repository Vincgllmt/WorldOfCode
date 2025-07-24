export interface Post {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  authorId: number
  authorUsername: string
  techGroupId: number
  techGroupName: string
}

export interface CreatePostPayload {
  content: string
  groupId: number
}

export interface UpdatePostPayload {
  content: string
  groupId: number
}
