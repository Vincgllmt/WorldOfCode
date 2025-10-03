import { Message, LastMessage } from "./message"
import { Participant } from "./participant"


export type ConversationType = "direct" | "group"

export interface Conversation {
    id: string
    type: ConversationType
    title?: string | null
    createdAt: string
    participants: Participant[]
    lastMessage?: LastMessage
    messages?: Message[]
}

export interface CreateConversationPayload {
    participantId: string
    title?: string
    type?: ConversationType
}