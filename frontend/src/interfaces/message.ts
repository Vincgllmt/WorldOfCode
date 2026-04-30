export type MessageType =
    | 'text' | 'image' | 'file' | 'call' | 'missed_call'
    | 'session_proposal' | 'session_counter_proposal' | 'session_closed'
    | 'appointment_proposal'

export interface Message {
    id: string
    conversationId: string
    body: string
    type: MessageType
    read: boolean
    sender: {
        id: number
        username: string
    }
    createdAt: string
    editedAt?: string | null
    deletedAt?: string | null
}

export interface CreateMessagePayload {
    conversationId: string
    body: string
    type?: MessageType
}

export interface LastMessage {
    id: string
    body: string
    type?: MessageType
    createdAt: string
    sender: {
        id: number
        username: string
    }
    read: boolean
}
