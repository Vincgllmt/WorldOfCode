"use client"

import { useParams } from "next/navigation"
import { useRealtimeMessages } from "@/hooks/useMessages"
import { useAuth } from "@/hooks/useAuth"
import { useConversations, useMarkConversationAsRead } from "@/hooks/useConversations"
import { useEffect } from "react"
import { ConversationHeader } from "@/components/message/ConversationHeader"
import { MessageList } from "@/components/message/MessageList"
import { MessageInput } from "@/components/message/MessageInput"

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const userId = user?.id?.toString()

    const { messages, sendMessage, typingUsers } = useRealtimeMessages(id, userId)
    const { data: conversations } = useConversations()
    const { mutate: markAsRead } = useMarkConversationAsRead()

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

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4">
            <ConversationHeader title={title} />
            {/* <MessageList messages={messages || []} userId={userId} convType={conv?.type} /> */}
            <MessageList
                messages={messages || []}
                userId={userId}
                convType={conv?.type}
                typingUsers={typingUsers}
                otherUsername={otherUser?.username}
            />
            <MessageInput onSend={sendMessage} conversationId={id} />

            {/* <MessageInput onSend={sendMessage} /> */}
        </div>
    )
}
