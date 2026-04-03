export type SuggestionStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'

export interface SuggestionUser {
  id: number
  username: string
}

export interface GroupSuggestion {
  id: number
  name: string
  description: string | null
  rssFeedUrl: string | null
  status: SuggestionStatus
  suggestedBy: SuggestionUser
  claimedBy: SuggestionUser | null
  claimedAt: string | null
  approvedBy: SuggestionUser | null
  approvedAt: string | null
  rejectedBy: SuggestionUser | null
  rejectedAt: string | null
  resolutionNote: string | null
  createdAt: string
}

export interface RejectSuggestionPayload {
  resolutionNote: string
}

export interface ApproveSuggestionPayload {
  name: string
  description: string
  rssFeedUrl: string
}
