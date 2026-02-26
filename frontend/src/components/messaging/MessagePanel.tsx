'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageCircle, UserPlus } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateConversation, useConversations } from '@/hooks/useConversations'
import { useContacts } from '@/hooks/useContacts'
import { useAuth } from '@/hooks/useAuth'

type MessagePanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectConversation?: (conversationId: string) => void
}

export function MessagePanel({ open, onOpenChange, onSelectConversation }: MessagePanelProps) {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id

  const { data: conversations, isLoading: isLoadingConversations, isError: conversationsError } =
    useConversations()

  const { contacts, isLoading: isLoadingContacts } = useContacts()

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'conversations' | 'new'>('conversations')
  const [contactQuery, setContactQuery] = useState('')

  const createConversation = useCreateConversation()

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  )

  // IDs des contacts avec qui une conversation directe existe déjà
  const existingDirectContactIds = useMemo(() => {
    if (!conversations || !userId) return new Set<number>()
    const ids = new Set<number>()
    for (const conv of conversations) {
      if (conv.type === 'direct') {
        for (const p of conv.participants) {
          if (p.id !== userId) ids.add(p.id)
        }
      }
    }
    return ids
  }, [conversations, userId])

  const filteredContacts = useMemo(() => {
    const available = contacts.filter((c) => !existingDirectContactIds.has(c.id))
    const normalizedQuery = contactQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return available
    }
    return available.filter((contact) =>
      contact.username.toLowerCase().includes(normalizedQuery)
    )
  }, [contacts, contactQuery, existingDirectContactIds])

  useEffect(() => {
    if (!open) {
      setSelectedContactId(null)
      setActiveTab('conversations')
      setContactQuery('')
    }
  }, [open])

  const handleSelectConversation = (conversationId: string) => {
    onOpenChange(false)
    if (onSelectConversation) {
      onSelectConversation(conversationId)
    } else {
      router.push(`/message/${conversationId}`)
    }
  }

  const handleCreateConversation = () => {
    if (!selectedContactId) {
      return
    }

    createConversation.mutate(
      { targetUserId: selectedContactId, type: 'direct' },
      {
        onSuccess: (conversation) => {
          handleSelectConversation(conversation.id)
          setSelectedContactId(null)
        },
      }
    )
  }

  const renderConversationList = () => {
    if (isLoadingConversations) {
      return (
        <div className="space-y-3" role="status" aria-live="polite">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`conv-skeleton-${index}`} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (conversationsError) {
      return (
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger vos conversations pour le moment.
        </p>
      )
    }

    const activeConversations = conversations?.filter((c) => c.lastMessage) ?? []

    if (!activeConversations.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <MessageCircle className="size-6" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Aucune conversation pour le moment</p>
            <p>Démarrez un échange via l'onglet "Nouveau message".</p>
          </div>
        </div>
      )
    }

    return (
      <ul className="space-y-2" role="list">
        {activeConversations.map((conversation) => {
          const hasUnread = conversation.lastMessage ? !conversation.lastMessage.read : false
          const title =
            conversation.title ??
            conversation.participants
              .filter((participant) => participant.id !== userId)
              .map((participant) => participant.username)
              .join(', ')

          const rawPreview = conversation.lastMessage?.body ?? 'Nouvelle conversation'
          const isSharedPost = rawPreview.includes('shared-post-card')
          const isCallMessage = rawPreview.startsWith('Appel vidéo')
          const isMine = conversation.lastMessage?.sender?.id === userId
          const preview = isCallMessage
            ? `📞 ${rawPreview}`
            : isSharedPost
              ? (isMine ? '📎 Vous avez partagé une publication' : '📎 A partagé une publication')
              : rawPreview.replace(/<[^>]*>/g, '').trim()

          return (
            <li key={conversation.id} role="listitem">
              <button
                type="button"
                onClick={() => handleSelectConversation(conversation.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-3 text-left transition hover:border-accent hover:bg-accent/40 focus-visible:border-ring focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="size-10">
                  <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold leading-tight text-foreground">
                      {title || 'Conversation'}
                    </span>
                    {hasUnread && (
                      <Badge variant="secondary" className="shrink-0 text-xs font-medium">
                        Non lu
                      </Badge>
                    )}
                  </div>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{preview}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderNewMessage = () => {
    if (!userId) {
      return (
        <p className="text-sm text-muted-foreground">
          Connectez-vous pour démarrer une conversation.
        </p>
      )
    }

    const isBusy = createConversation.isPending

    return (
      <div className="space-y-4">
        <div>
          <Command
            className="bg-background"
            search={contactQuery}
            onSearchChange={setContactQuery}
          >
            <CommandInput
              placeholder="Rechercher un contact..."
              aria-label="Rechercher un contact"
            />
            <CommandList>
              {isLoadingContacts ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Chargement des contacts...
                </div>
              ) : (
                <CommandGroup heading="Contacts">
                  {filteredContacts.length === 0 ? (
                    <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                  ) : (
                    filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.username}
                        onSelect={() => setSelectedContactId(contact.id)}
                      >
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {contact.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {contact.username}
                          </span>
                          {contact.relation === 'mutual' && (
                            <span className="text-xs text-muted-foreground">
                              Abonné·e mutuel·le
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
        {selectedContact && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="size-10">
              <AvatarFallback>{selectedContact.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{selectedContact.username}</span>
              {selectedContact.relation === 'mutual' && (
                <span className="text-xs text-muted-foreground">
                  Abonné·e mutuel·le
                </span>
              )}
            </div>
          </div>
        )}
        <Button
          type="button"
          className="w-full"
          onClick={handleCreateConversation}
          disabled={!selectedContactId || isBusy}
        >
          {isBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Démarrage...
            </>
          ) : (
            <>
              <UserPlus className="size-4" aria-hidden="true" />
              Démarrer
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Messagerie</SheetTitle>
          <SheetDescription>Retrouvez vos conversations ou démarrez un nouvel échange.</SheetDescription>
        </SheetHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'conversations' | 'new')}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="new">Nouveau message</TabsTrigger>
          </TabsList>
          <TabsContent value="conversations" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto pr-1">{renderConversationList()}</div>
          </TabsContent>
          <TabsContent value="new" className="mt-4">
            {renderNewMessage()}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
