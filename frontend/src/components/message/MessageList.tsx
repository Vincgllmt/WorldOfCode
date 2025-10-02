import { useEffect, useRef } from "react"
import { Message } from "@/interfaces/message"

type Props = {
    messages: Message[]
    userId?: string
    convType?: string
}

export function MessageList({ messages, userId, convType }: Props) {
    const bottomRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    return (
        <div className="flex-1 overflow-y-auto border p-4 mb-4 rounded space-y-2">
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
            <div ref={bottomRef} />
        </div>
    )
}
