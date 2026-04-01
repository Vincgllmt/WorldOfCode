export interface AdminUserListItem {
  id: number
  username: string
  email: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  creationDate: string   // ISO 8601
  postCount: number
  followerCount: number
  avatarUrl: string | null
}
