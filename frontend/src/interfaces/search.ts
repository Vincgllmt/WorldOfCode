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

export interface SearchResponse {
  users: UserPreview[]
  groups: GroupPreview[]
}
