"use client"

import { useState, useMemo, useEffect } from "react"
import { useConversations, useCreateConversation } from "@/hooks/useConversations"
import { useContacts } from "@/hooks/useContacts"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { useAuth } from '@/hooks/useAuth'
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { MessageCircle, SquarePen, X, Loader2 } from "lucide-react"
import { useOnlineUsers } from "@/hooks/useOnlineUsers"

function getMessagePreview(body: string, isMine: boolean): string {
    if (body.includes('shared-post-card')) {
        return isMine ? '📎 Vous avez partagé une publication' : '📎 A partagé une publication'
    }
    return body.replace(/<[^>]*>/g, '').trim()
}

function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    }
    if (days === 1) return "Hier"
    if (days < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" })
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default function MessagingLayout({ children }: { children: React.ReactNode }) {
    const { data: conversations, isLoading } = useConversations()
    const { user } = useAuth()
    const params = useParams<{ id?: string }>()
    const currentConversationId = params?.id
    const router = useRouter()

    const [showNewConversation, setShowNewConversation] = useState(false)
    const [contactQuery, setContactQuery] = useState('')
    const [justCreatedId, setJustCreatedId] = useState<string | null>(null)

    const { contacts, isLoading: isLoadingContacts } = useContacts()
    const createConversation = useCreateConversation()
    const { isOnline } = useOnlineUsers()

    // IDs des contacts avec qui une conversation directe existe déjà
    const existingDirectContactIds = useMemo(() => {
        if (!conversations || !user?.id) return new Set<number>()
        const ids = new Set<number>()
        for (const conv of conversations) {
            if (conv.type === 'direct') {
                for (const p of conv.participants) {
                    if (p.id !== user.id) ids.add(p.id)
                }
            }
        }
        return ids
    }, [conversations, user?.id])

    const filteredContacts = useMemo(() => {
        const available = contacts.filter((c) => !existingDirectContactIds.has(c.id))
        const normalizedQuery = contactQuery.trim().toLowerCase()
        if (!normalizedQuery) return available
        return available.filter((contact) =>
            contact.username.toLowerCase().includes(normalizedQuery)
        )
    }, [contacts, contactQuery, existingDirectContactIds])

    const handleStartConversation = (contactId: number) => {
        createConversation.mutate(
            { targetUserId: contactId, type: 'direct' },
            {
                onSuccess: (conversation) => {
                    setShowNewConversation(false)
                    setContactQuery('')
                    setJustCreatedId(conversation.id)
                    router.push(`/message/${conversation.id}`)
                },
            }
        )
    }

    // Nettoyer justCreatedId dès que la conversation a un message
    useEffect(() => {
        if (justCreatedId) {
            const conv = conversations?.find((c) => c.id === justCreatedId)
            if (conv?.lastMessage) {
                setJustCreatedId(null)
            }
        }
    }, [conversations, justCreatedId])

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Sidebar conversations */}
            <div className="w-[360px] border-r border-border bg-background flex flex-col">
                {/* Header sidebar */}
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Messages</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            setShowNewConversation(!showNewConversation)
                            setContactQuery('')
                        }}
                        title="Nouvelle conversation"
                    >
                        {showNewConversation ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <SquarePen className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Panneau nouvelle conversation */}
                {showNewConversation && (
                    <div className="border-b border-border">
                        <Command className="bg-background rounded-none" shouldFilter={false}>
                            <CommandInput
                                placeholder="Rechercher un contact..."
                                value={contactQuery}
                                onValueChange={setContactQuery}
                            />
                            <CommandList className="max-h-[300px]">
                                {isLoadingContacts ? (
                                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Chargement des contacts...
                                    </div>
                                ) : filteredContacts.length === 0 ? (
                                    <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                                ) : (
                                    <CommandGroup heading="Contacts">
                                        {filteredContacts.map((contact) => (
                                            <CommandItem
                                                key={contact.id}
                                                value={contact.username}
                                                onSelect={() => handleStartConversation(contact.id)}
                                                disabled={createConversation.isPending}
                                                className="cursor-pointer"
                                            >
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className="text-xs">
                                                        {contact.username.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-foreground truncate">
                                                        {contact.username}
                                                    </span>
                                                    {contact.relation === 'mutual' && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Abonné·e mutuel·le
                                                        </span>
                                                    )}
                                                </div>
                                                {createConversation.isPending && (
                                                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </div>
                )}

                {/* Liste */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {conversations
                        ?.filter((conv) => conv.lastMessage || conv.id === justCreatedId || conv.id === currentConversationId)
                        .sort((a, b) => {
                            const aDate = a.lastMessage
                                ? new Date(a.lastMessage.createdAt).getTime()
                                : new Date(a.createdAt).getTime()
                            const bDate = b.lastMessage
                                ? new Date(b.lastMessage.createdAt).getTime()
                                : new Date(b.createdAt).getTime()
                            return bDate - aDate
                        })
                        .map((conv) => {
                            const isActive = conv.id === currentConversationId
                            const isUnread =
                                conv.lastMessage &&
                                !conv.lastMessage.read &&
                                conv.lastMessage.sender?.id !== user?.id &&
                                conv.id !== currentConversationId

                            const otherParticipants = conv.participants.filter((p) => p.id !== user?.id)
                            const displayName = conv.title || otherParticipants.map((p) => p.username).join(", ") || "Conversation"
                            const initials = displayName.slice(0, 2).toUpperCase()

                            return (
                                <Link
                                    key={conv.id}
                                    href={`/message/${conv.id}`}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 transition-colors relative",
                                        isActive
                                            ? "bg-accent border-l-3 border-l-primary"
                                            : "hover:bg-muted/50 border-l-3 border-l-transparent"
                                    )}
                                >
                                    {/* Avatar + pastille en ligne */}
                                    <div className="relative shrink-0">
                                        <Avatar className="h-12 w-12">
                                            <AvatarFallback className={clsx(
                                                "text-sm font-semibold",
                                                isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                            )}>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {conv.type === 'direct' && otherParticipants.length > 0 && isOnline(otherParticipants[0].id) && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                        )}
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={clsx(
                                                "truncate text-[15px]",
                                                isUnread ? "font-bold text-foreground" : "font-medium text-foreground"
                                            )}>
                                                {displayName}
                                            </span>
                                            {conv.lastMessage && (
                                                <span className={clsx(
                                                    "text-xs shrink-0 ml-2",
                                                    isUnread ? "text-primary font-semibold" : "text-muted-foreground"
                                                )}>
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className={clsx(
                                                "text-sm truncate",
                                                isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                                            )}>
                                                {conv.lastMessage ? getMessagePreview(conv.lastMessage.body, conv.lastMessage.sender?.id === user?.id) : "Aucun message"}
                                            </span>
                                            {isUnread && (
                                                <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                                    1
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}

                    {!isLoading && conversations?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mb-3 stroke-1" />
                            <p className="text-sm">Aucune conversation</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Conversation sélectionnée */}
            <div className="flex-1 flex flex-col bg-muted/50">{children}</div>
        </div>
    )
}
