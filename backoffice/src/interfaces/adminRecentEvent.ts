export type AdminRecentEventType = 'new_user' | 'new_post' | 'new_report'

export interface AdminRecentEvent {
  type: AdminRecentEventType
  actor: string
  excerpt: string | null
  createdAt: string // ISO 8601
}
