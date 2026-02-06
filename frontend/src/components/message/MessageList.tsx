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

function formatMessageTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatDateSeparator(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function isSameDay(a: string, b: string) {
    const d1 = new Date(a)
    const d2 = new Date(b)
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
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
        estimateSize: () => 60,
        overscan: 10,
        paddingEnd: 16,
    })

    useEffect(() => {
        if (messages?.length) {
            setTimeout(() => {
                virtualizer.scrollToIndex(messages.length - 1, { align: "end", behavior: "smooth" })
            }, 50)
        }
    }, [messages?.length])

    return (
        <div
            ref={parentRef}
            className="relative flex-1 overflow-y-auto px-4"
            style={{ background: "linear-gradient(180deg, #e8f5e9 0%, #f1f5f1 40%, #f5f5f5 100%)" }}
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
                    const prevMsg = virtualRow.index > 0 ? messages[virtualRow.index - 1] : null
                    const isMe = m.sender.id?.toString() === userId

                    const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, m.createdAt)
                    const isContinuation = prevMsg && prevMsg.sender.id === m.sender.id && !showDateSep

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
                            {showDateSep && (
                                <div className="flex items-center justify-center py-3">
                                    <span className="px-3 py-1 bg-white/80 text-gray-500 text-xs font-medium rounded-full shadow-sm">
                                        {formatDateSeparator(m.createdAt)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex ${isContinuation ? "pt-0.5" : "pt-2"} ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[70%]">
                                    {convType === "group" && !isMe && !isContinuation && (
                                        <div className="text-xs font-semibold text-green-700 mb-0.5 ml-1">
                                            {m.sender.username}
                                        </div>
                                    )}

                                    <div
                                        className={`px-3 py-2 break-words ${isMe
                                            ? isContinuation
                                                ? "bg-green-500 text-white rounded-2xl rounded-tr-md"
                                                : "bg-green-500 text-white rounded-2xl rounded-br-md"
                                            : isContinuation
                                                ? "bg-white text-gray-900 shadow-sm rounded-2xl rounded-tl-md"
                                                : "bg-white text-gray-900 shadow-sm rounded-2xl rounded-bl-md"
                                            }`}
                                    >
                                        <p className="text-[15px] leading-relaxed">{m.body}</p>
                                        <p className={`text-[10px] mt-1 text-right ${isMe ? "text-green-100" : "text-gray-400"}`}>
                                            {formatMessageTime(m.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {typingUsers.length > 0 && (
                <div className="sticky bottom-0 left-0 pb-2 pt-1">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                        <span className="text-xs text-gray-400">est en train d&apos;écrire</span>
                    </div>
                </div>
            )}
        </div>
    )
}
