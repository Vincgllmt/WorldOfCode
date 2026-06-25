export interface AdminMentor {
  id: number
  userId: number
  username: string
  isAvailable: boolean
  specialties: string[]
  averageRating: number | null
  totalSessions: number
  reliabilityRate: number | null
  maxActiveMentees: number
  teachingStyle: string | null
  createdAt: string
}

export interface AdminMentorDetail extends AdminMentor {
  email: string
  activeSessions: number
  totalMentees: number
  mentorBio: string | null
}
