export interface SuggestedUser {
  id: number
  username: string
  firstname: string | null
  lastname: string | null
  avatarUrl: string | null
  bio: string | null
  location: string | null
  score: number
  sharedSkills: string[]
  sharedGroups: string[]
  mutualFollowsCount: number
}
