'use client'

import { useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  conversationId: string
  juniorUsername: string
  onClose: () => void
}

function formatDateFr(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function minDatetimeLocal(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function ProposeDateModal({ conversationId, juniorUsername, onClose }: Props) {
  const { user } = useAuth()
  const [datetime, setDatetime] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = () => {
    if (!datetime || !user) return
    setSending(true)

    const formatted = formatDateFr(datetime)
    const body = note.trim()
      ? `📅 Proposition de session\nJe vous propose de nous retrouver le ${formatted}.\n${note.trim()}`
      : `📅 Proposition de session\nJe vous propose de nous retrouver le ${formatted}.\nMerci de confirmer votre disponibilité.`

    if (!socket.connected) {
      socket.auth = { token: user.token, userId: user.id }
      socket.connect()
    }

    socket.emit('join_conversation', { conversation_id: conversationId })
    socket.emit('send_message', {
      conversation_id: conversationId,
      temp_id: Date.now().toString(),
      body,
      type: 'text',
    })

    setSending(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="propose-date-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 id="propose-date-title" className="font-semibold">Proposer une date</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            La proposition sera envoyée à <span className="font-medium text-foreground">{juniorUsername}</span> dans votre conversation.
          </p>

          <div>
            <label htmlFor="propose-datetime" className="block text-sm font-medium mb-1">
              Date et heure
            </label>
            <input
              id="propose-datetime"
              type="datetime-local"
              min={minDatetimeLocal()}
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div>
            <label htmlFor="propose-note" className="block text-sm font-medium mb-1">
              Message complémentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              id="propose-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex : On commencera par les hooks React..."
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!datetime || sending}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              Envoyer la proposition
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
