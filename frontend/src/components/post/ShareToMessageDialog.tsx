'use client'

import { useState, useMemo } from 'react'
import type { Post } from '@/interfaces/post'
import { useContacts, type Contact } from '@/hooks/useContacts'
import { useCreateConversation } from '@/hooks/useConversations'
import { useAuth } from '@/hooks/useAuth'
import { socket } from '@/lib/socket'
import { buildSharedPostHtml } from '@/lib/buildSharedPostHtml'
import toast from 'react-hot-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from '@/components/ui/command'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, FileText, Users } from 'lucide-react'

type Props = {
    post: Post
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function ShareToMessageDialog({ post, open, onOpenChange }: Props) {
    const { contacts, isLoading: isLoadingContacts } = useContacts()
    const createConversation = useCreateConversation()
    const { user } = useAuth()

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [contactQuery, setContactQuery] = useState('')
    const [personalMessage, setPersonalMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    const filteredContacts = useMemo(() => {
        const q = contactQuery.trim().toLowerCase()
        if (!q) return contacts
        return contacts.filter((c) => c.username.toLowerCase().includes(q))
    }, [contacts, contactQuery])

    const resetState = () => {
        setSelectedContact(null)
        setContactQuery('')
        setPersonalMessage('')
        setIsSending(false)
    }

    const handleSend = () => {
        if (!selectedContact || !user) return
        setIsSending(true)

        createConversation.mutate(
            { targetUserId: selectedContact.id, type: 'direct' },
            {
                onSuccess: (conversation) => {
                    // S'assurer que le socket est connecté
                    if (!socket.connected) {
                        socket.auth = {
                            token: user.token,
                            userId: user.id,
                        }
                        socket.connect()
                    }

                    const body = buildSharedPostHtml(post, personalMessage)
                    const tempId = Date.now().toString()

                    socket.emit('send_message', {
                        conversation_id: conversation.id,
                        temp_id: tempId,
                        body,
                    })

                    toast.success(`Post envoyé à ${selectedContact.username}`)
                    resetState()
                    onOpenChange(false)
                },
                onError: () => {
                    toast.error("Erreur lors de l'envoi")
                    setIsSending(false)
                },
            }
        )
    }

    // Extrait texte brut pour l'aperçu
    const postExcerpt = post.content?.replace(/<[^>]*>/g, '').slice(0, 100) || ''

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) resetState()
                onOpenChange(v)
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Envoyer en message</DialogTitle>
                    <DialogDescription>
                        Choisissez un contact et ajoutez un message personnel (optionnel).
                    </DialogDescription>
                </DialogHeader>

                {/* Sélecteur de contact */}
                {!selectedContact ? (
                    <Command className="rounded-lg border" shouldFilter={false}>
                        <CommandInput
                            placeholder="Rechercher un contact..."
                            value={contactQuery}
                            onValueChange={setContactQuery}
                        />
                        <CommandList className="max-h-[200px]">
                            {isLoadingContacts ? (
                                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Chargement...
                                </div>
                            ) : filteredContacts.length === 0 ? (
                                <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                            ) : (
                                <CommandGroup heading="Contacts">
                                    {filteredContacts.map((contact) => (
                                        <CommandItem
                                            key={contact.id}
                                            value={contact.username}
                                            onSelect={() => setSelectedContact(contact)}
                                            className="cursor-pointer"
                                        >
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="text-xs">
                                                    {contact.username.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">
                                                    {contact.username}
                                                </span>
                                                {contact.relation === 'mutual' && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Abonné·e mutuel·le
                                                    </span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                        <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                                {selectedContact.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">
                            {selectedContact.username}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContact(null)}
                        >
                            Changer
                        </Button>
                    </div>
                )}

                {/* Message personnel */}
                <div className="space-y-2">
                    <Label htmlFor="personal-msg">Message personnel (optionnel)</Label>
                    <Textarea
                        id="personal-msg"
                        value={personalMessage}
                        onChange={(e) => setPersonalMessage(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        disabled={isSending}
                    />
                </div>

                {/* Aperçu du post */}
                <div className="rounded-xl border overflow-hidden bg-card">
                    <div className="h-1 bg-primary" />
                    <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                                    {post.authorUsername.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                                    {post.authorUsername}
                                </p>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground leading-tight">
                                    <Users className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{post.techGroupName}</span>
                                </div>
                            </div>
                        </div>
                        {postExcerpt && (
                            <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                                {postExcerpt}{postExcerpt.length >= 100 ? '…' : ''}
                            </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-primary font-medium pt-0.5">
                            <FileText className="h-3 w-3" />
                            <span>Publication</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            resetState()
                            onOpenChange(false)
                        }}
                    >
                        Annuler
                    </Button>
                    <Button
                        disabled={!selectedContact || isSending}
                        onClick={handleSend}
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Envoi…
                            </>
                        ) : (
                            'Envoyer'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
