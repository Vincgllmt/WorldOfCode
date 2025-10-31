import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getMessages } from "@/services/messageService"
import { socket } from "@/lib/socket"
import { Message } from "@/interfaces/message"
import { Conversation } from "@/interfaces/conversation"
import { useAuth } from "@/hooks/useAuth"

// === Requête standard pour récupérer les messages ===
export const useMessages = (conversationId: string) => {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => getMessages(conversationId),
        enabled: !!conversationId,
        refetchInterval: 5000,
    })
}

// === Hook temps réel avec Socket.IO ===
export const useRealtimeMessages = (
    conversationId: string,
    userId: string | number | undefined
) => {
    const { user } = useAuth()
    const { data: messages, isLoading, error, refetch } = useMessages(conversationId)
    const queryClient = useQueryClient()


    const [typingUsers, setTypingUsers] = useState<string[]>([])

    useEffect(() => {
        if (!conversationId || !userId) return


        if (!socket.connected) {
            socket.auth = {
                token: user?.token,
                userId: user?.id,
            }
            socket.connect()
        }

        // 🧩 Join la conversation
        socket.emit("join_conversation", { conversation_id: conversationId })

        // --- Gestion des nouveaux messages ---
        const onMessageCreated = (data: Message) => {
            refetch()
        }

        // --- Gestion du "typing" ---
        type TypingEventPayload = {
            conversation_id: string
            user_id: string | number
            is_typing: boolean
        }

        const onTyping = ({ conversation_id, user_id, is_typing }: TypingEventPayload) => {
            if (conversation_id !== conversationId || user_id === userId) return

            setTypingUsers((prev) =>
                is_typing
                    ? [...new Set([...prev, user_id.toString()])]
                    : prev.filter((id) => id !== user_id.toString())
            )
        }

        socket.on("message_created", onMessageCreated)
        socket.on("typing", onTyping)

        // Cleanup
        return () => {
            socket.off("message_created", onMessageCreated)
            socket.off("typing", onTyping)
            socket.emit("leave_conversation", { conversation_id: conversationId })
            socket.disconnect()
        }
    }, [conversationId, userId, refetch])

    // --- Envoi de message ---
    const sendMessage = (body: string) => {
        if (!body.trim() || !user) return
        const tempId = Date.now().toString()

        socket.emit("send_message", {
            conversation_id: conversationId,
            temp_id: tempId,
            body,
        })

        const optimisticMessage: Message = {
            id: tempId,
            body,
            type: "text",
            createdAt: new Date().toISOString(),
            read: true,
            sender: {
                id: user.id,
                username: user.username,
            },
            conversationId: conversationId,
        }

        // Optimistic update pour messages
        queryClient.setQueryData<Message[]>(["messages", conversationId], (old) => {
            if (!old) return [optimisticMessage]
            return [...old, optimisticMessage]
        })

        // Mise à jour de la liste des conversations
        queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
            if (!old) return old
            return old.map((conv) =>
                conv.id === conversationId
                    ? { ...conv, lastMessage: optimisticMessage }
                    : conv
            )
        })
    }

    return { messages, isLoading, error, sendMessage, refetch, typingUsers }
}
