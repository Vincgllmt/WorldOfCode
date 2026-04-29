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

export interface RequestSessionSummary {
  id: number
  format: SessionFormat
  conversationId: string | null
  mentor: { id: number; username: string }
  status: MentoringSessionStatus
  scheduledAt: string | null
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
  codeSnippet: string | null
  codeLanguage: string | null
  descriptionExcerpt?: string
  isPublic: boolean
  isTargeted: boolean
  compatibilityScore: number
  junior: { id: number; username: string; avatar?: string }
  targetMentor?: { id: number; username: string }
  createdAt: string
  pin?: { expiresAt: string; isActive: boolean }
  session?: RequestSessionSummary | null
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
  request?: { id: number; title: string; techStack: string; isPublic: boolean } | null
  createdAt: string
}

export interface SessionAppointment {
  id: number
  scheduledAt: string
  format: SessionFormat
  status: 'pending' | 'confirmed'
  createdAt: string
}

export interface MentoringRating {
  id: number
  score: number | null
  comment: string | null
  submittedAt: string | null
  isVisible: boolean
  rater: { id: number; username: string }
  ratee: { id: number; username: string }
}
