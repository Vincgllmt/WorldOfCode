export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export interface AdminChallenge {
  id: number
  slug: string
  title: string
  difficulty: ChallengeDifficulty
  languages: string[]
  maxScore: number
  refereeLanguage: string | null
  testsCount: number
  badgesCount: number
  solutionLanguages: string[]
  submissionsCount: number
  solvedByCount: number
  updatedAt: string
}

export interface AdminChallengeTest {
  position: number
  stdin: string | null
}

export interface AdminChallengeBadge {
  code: string
  name: string
  description: string | null
  icon: string | null
}

export interface AdminChallengeSolution {
  language: string
  code: string
}

export interface AdminChallengeDetail {
  id: number
  slug: string
  title: string
  statement: string
  difficulty: ChallengeDifficulty
  languages: string[]
  maxScore: number
  image: string | null
  refereeLanguage: string | null
  refereeCode: string | null
  tests: AdminChallengeTest[]
  badges: AdminChallengeBadge[]
  solutions: AdminChallengeSolution[]
  createdAt: string
  updatedAt: string
}

export interface SolutionCaseResult {
  index: number
  verdict: 'passed' | 'failed'
  score: number
  playerStderr: string
  error: string | null
}

export interface SolutionVerification {
  language: string
  verdict: 'passed' | 'failed'
  testsPassed: number
  testsTotal: number
  results: SolutionCaseResult[]
}
