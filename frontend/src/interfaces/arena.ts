export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export interface ArenaChallenge {
  id: number
  slug: string
  title: string
  difficulty: ChallengeDifficulty
  languages: string[]
  maxScore: number
  image?: string | null
  /** Icône de la médaille du défi (badge « first_solve »), connue même non débloquée. */
  badgeIcon?: string | null
  successRate: number
  solved: boolean
}

export interface PublicTest {
  stdin: string | null
  expectedOutput: string
}

export interface ArenaChallengeDetail extends ArenaChallenge {
  statement: string
  publicTests: PublicTest[]
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  username: string
  totalScore: number
  badgesCount: number
  isCurrentUser: boolean
}

export interface ArenaBadge {
  badgeId: number
  name: string
  description: string | null
  icon: string | null
  challengeSlug: string
  awardedAt: string
}

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

export interface SubmitResult {
  submissionId: number
  status: 'passed' | 'failed'
  score: number
  testsPassed: number
  testsTotal: number
  badgesAwarded: string[]
}
