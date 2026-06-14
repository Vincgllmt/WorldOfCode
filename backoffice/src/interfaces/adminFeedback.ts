export interface AdminFeedback {
  id: number
  userId: number
  username: string
  overallSatisfaction: number
  easeOfUse: number
  contentQuality: number
  messagingRating: number | null
  groupsRating: number | null
  mentoringRating: number | null
  npsScore: number
  comment: string | null
  status: 'new' | 'read' | 'processed'
  createdAt: string
}
