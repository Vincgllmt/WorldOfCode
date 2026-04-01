export interface AdminTopGroup {
  id: number
  name: string
  memberCount: number
  postCountThisMonth: number
}

export interface AdminStats {
  totalUsers: number
  totalPosts: number
  totalGroups: number
  pendingReportsCount: number
  newUsersThisWeek: number
  newPostsThisWeek: number
  topGroups: AdminTopGroup[]
}
