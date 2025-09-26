import { User } from "./user"

export type ParticipantRole = 'member' | 'admin'

export interface ConversationParticipant {
    conversationId: string
    user: User
    role: ParticipantRole
    joinedAt: string
}
