import { useEffect, useRef, useMemo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Message } from "@/interfaces/message"
import { Send, Phone, PhoneMissed, X, Download, FileArchive } from "lucide-react"
import { sanitizeHtml } from "@/lib/sanitizeHtml"

type Props = {
    messages: Message[]
    userId?: string
    convType?: string
    typingUsers?: string[]
    otherUsername?: string
    highlightMessageId?: string | null
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

/**
 * Affiche le texte d'un appel manqué selon le contexte :
 * - sender = celui qui a lancé l'appel (callerId)
 * - isMe = est-ce que JE suis l'appelant ?
 * - reason = "rejected" | "timeout" | "cancelled"
 */
function formatMissedCallText(reason: string, isMe: boolean, senderUsername: string): string {
    switch (reason) {
        case "rejected":
            return isMe ? "Appel refusé" : `Appel de ${senderUsername} refusé`
        case "timeout":
            return isMe ? "Appel sans réponse" : `Appel manqué de ${senderUsername}`
        case "cancelled":
            return isMe ? "Appel annulé" : `Appel manqué de ${senderUsername}`
        default:
            return isMe ? "Appel manqué" : `Appel manqué de ${senderUsername}`
    }
}

function parseFileBody(body: string): { url: string; name: string; size: number } | null {
    try {
        const data = JSON.parse(body)
        if (data.url && data.name) return data
    } catch { /* not JSON, fallback */ }
    return null
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

async function downloadFile(url: string, filename: string) {
    try {
        const res = await fetch(url)
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(blobUrl)
    } catch {
        window.open(url, "_blank")
    }
}

export function MessageList({
    messages,
    userId,
    convType,
    typingUsers = [],
    otherUsername,
    highlightMessageId,
}: Props) {
    const router = useRouter()
    const parentRef = useRef<HTMLDivElement | null>(null)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(highlightMessageId ?? null)

    // Intercepte les clics sur les liens internes (ex: /post/123) pour utiliser
    // la navigation client-side Next.js au lieu d'un rechargement complet,
    // ce qui évite le flash de thème (logo blanc → noir).
    const handleMessageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const anchor = (e.target as HTMLElement).closest('a')
        if (!anchor) return

        const href = anchor.getAttribute('href')
        if (href && href.startsWith('/')) {
            e.preventDefault()
            router.push(href)
        }
    }, [router])

    const virtualizer = useVirtualizer({
        count: messages?.length ?? 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 10,
        paddingEnd: 16,
    })

    const prevLengthRef = useRef(0)
    const didScrollToHighlight = useRef(false)

    // Scroll vers le message highlight
    useEffect(() => {
        if (!highlightedId || !messages?.length || didScrollToHighlight.current) return

        const idx = messages.findIndex((m) => m.id === highlightedId)
        if (idx >= 0) {
            didScrollToHighlight.current = true
            setTimeout(() => {
                virtualizer.scrollToIndex(idx, { align: "center", behavior: "auto" })
                setTimeout(() => setHighlightedId(null), 3000)
            }, 150)
        }
    }, [highlightedId, messages?.length])

    // Scroll vers le bas pour les nouveaux messages
    useEffect(() => {
        if (!messages?.length) return
        // Ne pas scroll vers le bas si on vient d'un highlight
        if (highlightedId || didScrollToHighlight.current) {
            // Reset après le premier chargement pour que les futurs messages scrollent normalement
            if (prevLengthRef.current > 0 && messages.length > prevLengthRef.current) {
                // Nouveau message reçu après le highlight → scroll vers le bas
                prevLengthRef.current = messages.length
                setTimeout(() => {
                    virtualizer.scrollToIndex(messages.length - 1, { align: "end", behavior: "smooth" })
                }, 50)
            } else {
                prevLengthRef.current = messages.length
            }
            return
        }

        const isInitialLoad = prevLengthRef.current === 0
        prevLengthRef.current = messages.length

        setTimeout(() => {
            virtualizer.scrollToIndex(messages.length - 1, {
                align: "end",
                behavior: isInitialLoad ? "auto" : "smooth",
            })
        }, 50)
    }, [messages?.length])

    if (!messages || messages.length === 0) {
        return (
            <div className="msg-list-bg relative flex-1 overflow-y-auto px-4 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <Send className="h-10 w-10 mx-auto mb-3 stroke-[1.2] text-muted-foreground/40" />
                    <p className="text-sm font-medium">Aucun message pour le moment</p>
                    <p className="text-xs mt-1">Envoyez le premier message !</p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={parentRef}
            className="msg-list-bg relative flex-1 overflow-y-auto px-4"
            onClick={handleMessageClick}
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
                    const hasSharedPost = m.body.includes('shared-post-card')
                    const isCallMessage = m.type === 'call' || m.type === 'missed_call'
                    const isMissedCall = m.type === 'missed_call'
                    const isImage = m.type === 'image'
                    const isFile = m.type === 'file'
                    const fileData = isFile ? parseFileBody(m.body) : null
                    const isHighlighted = m.id === highlightedId

                    return (
                        <div
                            key={m.id}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className={isHighlighted ? "animate-pulse bg-primary/10 rounded-lg transition-colors duration-1000" : ""}
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
                                    <span className="px-3 py-1 bg-card/80 text-muted-foreground text-xs font-medium rounded-full shadow-sm">
                                        {formatDateSeparator(m.createdAt)}
                                    </span>
                                </div>
                            )}

                            {isCallMessage ? (
                                <div className="flex justify-center pt-2 pb-1">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                                        isMissedCall
                                            ? "bg-destructive/10 border-destructive/30"
                                            : "bg-card/60 border-border/50"
                                    }`}>
                                        {isMissedCall ? (
                                            <PhoneMissed className="w-3.5 h-3.5 text-destructive" />
                                        ) : (
                                            <Phone className="w-3.5 h-3.5 text-primary" />
                                        )}
                                        <span className={`text-xs font-medium ${
                                            isMissedCall ? "text-destructive" : "text-muted-foreground"
                                        }`}>
                                            {isMissedCall
                                                ? formatMissedCallText(m.body, isMe, m.sender.username)
                                                : m.body
                                            }
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            {formatMessageTime(m.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ) : isImage ? (
                            <div className={`flex ${isContinuation ? "pt-0.5" : "pt-2"} ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[300px]">
                                    {convType === "group" && !isMe && !isContinuation && (
                                        <div className="text-xs font-semibold text-primary mb-0.5 ml-1">
                                            {m.sender.username}
                                        </div>
                                    )}
                                    <div className="relative group">
                                        <button type="button" onClick={() => setLightboxUrl(m.body)} className="block">
                                            <img
                                                src={m.body}
                                                alt="Image partagée"
                                                className={`rounded-2xl object-cover max-h-[300px] w-auto cursor-pointer hover:opacity-90 transition-opacity ${
                                                    isMe
                                                        ? isContinuation ? "rounded-tr-md" : "rounded-br-md"
                                                        : isContinuation ? "rounded-tl-md" : "rounded-bl-md"
                                                }`}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(m.body)
                                                    const blob = await res.blob()
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement("a")
                                                    a.href = url
                                                    a.download = `image-${Date.now()}.${blob.type.split("/")[1] || "png"}`
                                                    a.click()
                                                    URL.revokeObjectURL(url)
                                                } catch {
                                                    window.open(m.body, "_blank")
                                                }
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-right text-muted-foreground" : "text-muted-foreground"}`}>
                                        {formatMessageTime(m.createdAt)}
                                    </p>
                                </div>
                            </div>
                            ) : isFile && fileData ? (
                            <div className={`flex ${isContinuation ? "pt-0.5" : "pt-2"} ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[300px]">
                                    {convType === "group" && !isMe && !isContinuation && (
                                        <div className="text-xs font-semibold text-primary mb-0.5 ml-1">
                                            {m.sender.username}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(fileData.url, fileData.name)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors cursor-pointer ${
                                            isMe
                                                ? `bg-primary text-primary-foreground hover:bg-primary/90 ${isContinuation ? "rounded-tr-md" : "rounded-br-md"}`
                                                : `bg-card text-card-foreground shadow-sm hover:bg-muted ${isContinuation ? "rounded-tl-md" : "rounded-bl-md"}`
                                        }`}
                                    >
                                        <FileArchive className="h-8 w-8 shrink-0" />
                                        <div className="min-w-0 text-left">
                                            <p className="text-sm font-medium truncate">{fileData.name}</p>
                                            <p className={`text-xs ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                {formatFileSize(fileData.size)} — Cliquez pour télécharger
                                            </p>
                                        </div>
                                    </button>
                                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-right text-muted-foreground" : "text-muted-foreground"}`}>
                                        {formatMessageTime(m.createdAt)}
                                    </p>
                                </div>
                            </div>
                            ) : (
                            <div className={`flex ${isContinuation ? "pt-0.5" : "pt-2"} ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={hasSharedPost ? "max-w-[85%] min-w-[260px]" : "max-w-[70%]"}>
                                    {convType === "group" && !isMe && !isContinuation && (
                                        <div className="text-xs font-semibold text-primary mb-0.5 ml-1">
                                            {m.sender.username}
                                        </div>
                                    )}

                                    <div
                                        className={`px-3 py-2 break-words ${hasSharedPost
                                            ? "msg-bubble-received bg-card text-card-foreground shadow-sm rounded-2xl"
                                            : isMe
                                                ? isContinuation
                                                    ? "msg-bubble-own bg-primary text-primary-foreground rounded-2xl rounded-tr-md"
                                                    : "msg-bubble-own bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                                : isContinuation
                                                    ? "msg-bubble-received bg-card text-card-foreground shadow-sm rounded-2xl rounded-tl-md"
                                                    : "msg-bubble-received bg-card text-card-foreground shadow-sm rounded-2xl rounded-bl-md"
                                            }`}
                                    >
                                        <div
                                            className="text-[15px] leading-relaxed prose-sm prose-p:m-0 prose-p:leading-relaxed [&>p]:m-0"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.body) }}
                                        />
                                        <p className={`text-[10px] mt-1 text-right ${isMe && !hasSharedPost ? "msg-time text-primary-foreground/70" : "text-muted-foreground"}`}>
                                            {formatMessageTime(m.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {typingUsers.length > 0 && (
                <div className="sticky bottom-0 left-0 pb-2 pt-1">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-2xl shadow-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0s]" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.15s]" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                        <span className="text-xs text-muted-foreground">est en train d&apos;écrire</span>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setLightboxUrl(null)}
                >
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                    const res = await fetch(lightboxUrl)
                                    const blob = await res.blob()
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement("a")
                                    a.href = url
                                    a.download = `image-${Date.now()}.${blob.type.split("/")[1] || "png"}`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                } catch {
                                    window.open(lightboxUrl, "_blank")
                                }
                            }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <img
                        src={lightboxUrl}
                        alt="Image en grand"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}
