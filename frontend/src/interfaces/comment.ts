export interface Comment {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  authorId: number
  authorUsername: string
  postId: number
}

export interface CreateCommentPayload {
  content: string
  postId: number
}

export interface UpdateCommentPayload {
  id: number
  content: string
}
