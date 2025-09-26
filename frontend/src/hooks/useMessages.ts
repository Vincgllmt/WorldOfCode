import { useQuery } from "@tanstack/react-query"
import { getMessages } from "@/services/messageService"

export const useMessages = (conversationId: string) => {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => getMessages(conversationId),
        enabled: !!conversationId,
        refetchInterval: 5000,
    })
}
