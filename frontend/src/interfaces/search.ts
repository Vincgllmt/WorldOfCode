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
}

export interface GroupPreview {
  id: number
  name: string
}
