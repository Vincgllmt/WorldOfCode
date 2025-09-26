import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    getConversations,
    getConversationById,
    createConversation,
} from "@/services/conversationService"
import { CreateConversationPayload } from "@/interfaces/conversation"
import toast from "react-hot-toast"

export const useConversations = () => {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: getConversations,
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
            toast.success("Conversation créée avec succès ✅")
        },
        onError: () => {
            toast.error("Erreur lors de la création de la conversation ❌")
        },
    })
}
