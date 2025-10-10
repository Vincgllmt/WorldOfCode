import { useEffect, useRef } from "react"
import { Message } from "@/interfaces/message"

type Props = {
    messages: Message[]
    userId?: string
    convType?: string
    typingUsers?: string[]
    otherUsername?: string
}

export function MessageList({
    messages,
    userId,
    convType,
    typingUsers = [],
    otherUsername,
}: Props) {
    const bottomRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, typingUsers])

    return (
        <div className="relative flex-1 overflow-y-auto border p-4 mb-4 rounded space-y-2 bg-white">
            {/* Messages */}
            {messages?.map((m, i) => {
                const isMe = m.sender.id?.toString() === userId
                return (
                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`px-3 py-2 rounded-lg max-w-xs break-words ${isMe
                                ? "bg-green-500 text-white rounded-br-none"
                                : "bg-gray-200 text-black rounded-bl-none"
                                }`}
                        >
                            {convType === "group" && !isMe && (
                                <div className="text-xs font-semibold mb-1 text-gray-600">
                                    {m.sender.username}
                                </div>
                            )}
                            {m.body}
                        </div>
                    </div>
                )
            })}

            {/* 🔵 Bloc sticky pour l'état "en train d'écrire" */}
            {typingUsers.length > 0 && (
                <div className="sticky bottom-0 left-0 bg-white pt-2">
                    <div className="flex items-center gap-2 px-3 py-1 text-gray-500 italic">
                        {/* Animation de bulles */}
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    )
}

