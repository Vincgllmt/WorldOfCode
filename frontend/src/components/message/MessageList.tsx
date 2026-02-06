import { useEffect, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
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
    const parentRef = useRef<HTMLDivElement | null>(null)

    const virtualizer = useVirtualizer({
        count: messages?.length ?? 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 10,
    })

    // Auto-scroll vers le bas quand un nouveau message arrive
    useEffect(() => {
        if (messages?.length) {
            virtualizer.scrollToIndex(messages.length - 1, { align: "end", behavior: "smooth" })
        }
    }, [messages?.length, virtualizer])

    return (
        <div
            ref={parentRef}
            className="relative flex-1 overflow-y-auto border p-4 mb-4 rounded bg-white"
        >
            <div
                style={{
                    height: virtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const m = messages[virtualRow.index]
                    const isMe = m.sender.id?.toString() === userId
                    return (
                        <div
                            key={m.id}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div className={`flex py-1 ${isMe ? "justify-end" : "justify-start"}`}>
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
                        </div>
                    )
                })}
            </div>

            {/* Bloc sticky pour l'état "en train d'écrire" */}
            {typingUsers.length > 0 && (
                <div className="sticky bottom-0 left-0 bg-white pt-2">
                    <div className="flex items-center gap-2 px-3 py-1 text-gray-500 italic">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
