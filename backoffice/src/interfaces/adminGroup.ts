export interface AdminGroupListItem {
  id: number
  name: string
  description: string | null
  memberCount: number
  postCount: number
  creatorUsername: string | null
  createdAt: string  // ISO 8601
}
