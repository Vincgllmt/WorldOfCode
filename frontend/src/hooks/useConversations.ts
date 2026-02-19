import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    getConversations,
    getConversationById,
    createConversation,
    markConversationAsRead
} from "@/services/conversationService"
import { CreateConversationPayload } from "@/interfaces/conversation"
import toast from "react-hot-toast"
import { Conversation } from "@/interfaces/conversation"
import { useEffect } from "react"
import { socket } from "@/lib/socket"

export function useConversationRealtime(userId?: string | number) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!userId) return

        if (!socket.connected) {
            socket.auth = { userId }
            socket.connect()
        }

        const onMessageCreated = () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
        }

        socket.on("message_created", onMessageCreated)

        return () => {
            socket.off("message_created", onMessageCreated)
        }
    }, [userId, queryClient])
}

export function useConversations() {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: getConversations,
        refetchInterval: 10_000,
    })
}

export const useConversation = (id: string) => {
    return useQuery({
        queryKey: ["conversation", id],
        queryFn: () => getConversationById(id),
        enabled: !!id,
    })
}

export const useCreateConversation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: CreateConversationPayload) => createConversation(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
        },
        onError: () => {
            toast.error("Erreur lors de la création de la conversation")
        },
    })
}


export function useMarkConversationAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (conversationId: string) => markConversationAsRead(conversationId),
        onSuccess: (_, conversationId) => {

            queryClient.invalidateQueries({ queryKey: ["conversations"] })

            queryClient.setQueryData<Conversation[]>(["conversations"], (old: Conversation[] | undefined) => {
                if (!old) return old
                return old.map(conv =>
                    conv.id === conversationId
                        ? {
                            ...conv,
                            lastMessage: conv.lastMessage
                                ? { ...conv.lastMessage, read: true }
                                : undefined
                        }
                        : conv
                )
            })
        },
    })
}
