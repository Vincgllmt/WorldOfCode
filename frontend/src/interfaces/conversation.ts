import { Message } from "./message"
import { ConversationParticipant } from "./conversationParticipant"


export type ConversationType = 'direct' | 'group'

export interface Conversation {
    id: string
    type: ConversationType
    title?: string | null
    createdAt: string
    participants: ConversationParticipant[]
    messages?: Message[]
}

export interface CreateConversationPayload {
    participantId: string
    title?: string
    type?: ConversationType
}
