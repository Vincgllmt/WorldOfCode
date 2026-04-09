"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useRealtimeMessages } from "@/hooks/useMessages"
import { useAuth } from "@/hooks/useAuth"
import { useConversations, useMarkConversationAsRead } from "@/hooks/useConversations"
import { useEffect } from "react"
import { ConversationHeader } from "@/components/message/ConversationHeader"
import { MessageList } from "@/components/message/MessageList"
import { MessageInput } from "@/components/message/MessageInput"
import { useVideoCallContext } from "@/contexts/VideoCallContext"

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const highlightMessageId = searchParams.get('msg')
    const { user } = useAuth()
    const userId = user?.id?.toString()

    const { messages, sendMessage, typingUsers } = useRealtimeMessages(id, userId)
    const { data: conversations } = useConversations()
    const { mutate: markAsRead } = useMarkConversationAsRead()

    const { startCall, isCallActive } = useVideoCallContext()

    const conv = conversations?.find((c) => c.id === id)
    const otherUser =
        conv?.type === "direct"
            ? conv.participants.find((p) => p.id !== user?.id)
            : null

    const title = conv?.title || otherUser?.username || "Conversation"

    useEffect(() => {
        if (id) {
            markAsRead(id)
        }
    }, [id, markAsRead])

    const handleStartCall = () => {
        if (!isCallActive) {
            startCall(id)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <ConversationHeader title={title} userId={otherUser?.id} onStartCall={handleStartCall} />
            <MessageList
                messages={messages || []}
                userId={userId}
                convType={conv?.type}
                typingUsers={typingUsers}
                otherUsername={otherUser?.username}
                highlightMessageId={highlightMessageId}
            />
            <MessageInput onSend={sendMessage} conversationId={id} />
        </div>
    )
}
