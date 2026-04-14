export type TeachingStyle = 'guided' | 'direct' | 'socratic' | 'collaborative'
export type MentoringRequestType = 'debug' | 'one_to_one' | 'exercise' | 'code_review'
export type MentoringRequestStatus = 'pending' | 'pinned' | 'accepted' | 'cancelled' | 'expired'
export type MentoringSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type SessionFormat = 'text' | 'video' | 'hybrid'

export interface Skill {
  id: number
  name: string
}

export interface MentorProfile {
  id: number
  isAvailable: boolean
  teachingStyle: TeachingStyle | null
  maxActiveMentees: number
  mentorBio: string | null
  specialties: Skill[]
  averageRating: number | null
  reliabilityRate: number | null
  totalSessions: number
  createdAt: string
}

export interface MentoringRequest {
  id: number
  type: MentoringRequestType
  status: MentoringRequestStatus
  title: string
  techStack: string
  description: string
  blockedSince: string | null
  alreadyTried: string | null
  expectedBehavior: string | null
  observedBehavior: string | null
  isPublic: boolean
  compatibilityScore: number
  junior: { id: number; username: string; avatar?: string }
  targetMentor?: { id: number; username: string }
  createdAt: string
  pin?: { expiresAt: string; isActive: boolean }
}

export interface MentoringSession {
  id: number
  status: MentoringSessionStatus
  format: SessionFormat
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  conversationId: string | null
  mentor: { id: number; username: string; avatar?: string }
  junior: { id: number; username: string; avatar?: string }
  request?: MentoringRequest
  createdAt: string
}

export interface MentoringRating {
  id: number
  score: number
  comment: string | null
  submittedAt: string | null
  isVisible: boolean
  rater: { id: number; username: string }
  ratee: { id: number; username: string }
}
