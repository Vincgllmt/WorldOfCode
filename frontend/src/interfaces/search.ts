export interface SearchParams {
  q: string
  limit?: number
}

export interface SearchUsersParams {
  q: string
  limit?: number
}

export interface SearchGroupsParams {
  q: string
  limit?: number
}

export interface UserPreview {
  id: number
  username: string
  firstname: string | null
  lastname: string | null
  avatarUrl: string | null
}

export interface GroupPreview {
  id: number
  name: string
}

export interface PostPreview {
  id: number
  authorId: number | null
  authorUsername: string | null
  groupId: number | null
  groupName: string | null
  snippet: string
  createdAt: string | null
  score: number
}

export interface SearchResponse {
  users: UserPreview[]
  groups: GroupPreview[]
  posts: PostPreview[]
}
