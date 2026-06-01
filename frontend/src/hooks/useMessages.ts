import { useEffect, useState, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getMessages, searchMessages } from "@/services/messageService"
import { socket } from "@/lib/socket"
import { Message } from "@/interfaces/message"
import { Conversation } from "@/interfaces/conversation"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"

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
    const refetchRef = useRef(refetch)

    // Garder la ref à jour
    useEffect(() => {
        refetchRef.current = refetch
    }, [refetch])

    const [typingUsers, setTypingUsers] = useState<string[]>([])

    useEffect(() => {
        console.log("🔵 useEffect triggered", { conversationId, userId, user: !!user })
        if (!conversationId || !userId) {
            console.log("🔴 Missing conversationId or userId, returning")
            return
        }

        console.log("🟢 Socket connected?", socket.connected)
        if (!socket.connected) {
            console.log("🟡 Connecting socket...")
            socket.auth = {
                token: user?.token,
                userId: user?.id,
            }
            socket.connect()
        }

        // 🧩 Join la conversation
        console.log("🟢 Emitting join_conversation", conversationId)
        socket.emit("join_conversation", { conversation_id: conversationId })

        // --- Gestion des nouveaux messages ---
        const onMessageCreated = (data: any) => {
            console.log("📩 message_created received!", data)
            refetchRef.current()
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

        // Gestion des accusés de réception (notamment rejet par modération)
        const onAck = (payload: { temp_id?: string; error?: string; message?: string }) => {
            if (!payload?.error) return

            if (payload.error === "content_rejected") {
                // Retirer le message optimistic ajouté localement
                if (payload.temp_id) {
                    queryClient.setQueryData<Message[]>(
                        ["messages", conversationId],
                        (old) => (old ? old.filter((m) => m.id !== payload.temp_id) : old)
                    )
                }
                toast.error(payload.message || "Votre message a été rejeté par la modération.")
                return
            }

            // Autres erreurs génériques (unauthorized_user, db_insert_failed, ...)
            console.warn("📨 Erreur d'envoi de message :", payload)
        }

        console.log("🟢 Registering socket listeners")
        socket.on("message_created", onMessageCreated)
        socket.on("typing", onTyping)
        socket.on("ack", onAck)

        // Cleanup
        return () => {
            console.log("🔴 Cleanup: removing listeners")
            socket.off("message_created", onMessageCreated)
            socket.off("typing", onTyping)
            socket.off("ack", onAck)
            socket.emit("leave_conversation", { conversation_id: conversationId })
            // Ne PAS déconnecter le socket ici - il peut être utilisé par d'autres fonctionnalités (appel vidéo)
        }
    }, [conversationId, userId, user, queryClient])

    // --- Envoi de message ---
    const sendMessage = (body: string, type: Message['type'] = 'text') => {
        console.log("📤 sendMessage called", { body, type, user: !!user, conversationId })
        if (!body.trim() || !user) {
            console.log("🔴 sendMessage: missing body or user")
            return
        }
        const tempId = Date.now().toString()

        console.log("📤 Emitting send_message to socket")
        socket.emit("send_message", {
            conversation_id: conversationId,
            temp_id: tempId,
            body,
            type,
        })

        const optimisticMessage: Message = {
            id: tempId,
            body,
            type,
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

// === Hook recherche globale de messages ===
export function useSearchMessages(query: string) {
    const [debouncedQuery, setDebouncedQuery] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    return useQuery({
        queryKey: ['messageSearch', debouncedQuery],
        queryFn: () => searchMessages(debouncedQuery),
        enabled: debouncedQuery.length >= 2,
    })
}
