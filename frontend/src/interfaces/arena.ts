export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export interface ArenaChallenge {
  id: number
  slug: string
  title: string
  difficulty: ChallengeDifficulty
  languages: string[]
  maxScore: number
  image?: string | null
  successRate: number
  solved: boolean
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  username: string
  totalScore: number
  badgesCount: number
  isCurrentUser: boolean
}
