import { User } from "./user"

export interface Message {
    id: string
    conversationId: string
    sender: User
    body: string
    type: 'text' | 'image' | 'file'
    senderUsername: string
    senderId: string
    createdAt: string
    editedAt?: string | null
    deletedAt?: string | null
}

export interface CreateMessagePayload {
    conversationId: string
    body: string
    type?: 'text' | 'image' | 'file'
}
