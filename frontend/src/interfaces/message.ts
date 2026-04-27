export interface Message {
    id: string
    conversationId: string
    body: string
    type: 'text' | 'image' | 'file' | 'call' | 'missed_call' | 'session_proposal' | 'session_closed'
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
    type?: 'text' | 'image' | 'file' | 'call' | 'missed_call' | 'session_proposal' | 'session_closed'
}

export interface LastMessage {
    id: string
    body: string
    type?: 'text' | 'image' | 'file' | 'call' | 'missed_call' | 'session_proposal' | 'session_closed'
    createdAt: string
    sender: {
        id: number
        username: string
    }
    read: boolean
}
