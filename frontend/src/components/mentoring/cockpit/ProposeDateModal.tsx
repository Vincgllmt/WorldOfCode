'use client'

import { useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Props {
  conversationId: string
  sessionId: number
  juniorUsername: string
  onClose: () => void
}

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // lundi = 0
  const days: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

function formatDateFr(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

function sendViaSocket(conversationId: string, body: string, type: string, user: { token: string; id: number | string }) {
  const emit = () => {
    socket.emit('join_conversation', { conversation_id: conversationId })
    socket.emit('send_message', {
      conversation_id: conversationId,
      temp_id: Date.now().toString(),
      body,
      type,
    })
  }
  if (socket.connected) {
    emit()
  } else {
    socket.auth = { token: user.token, userId: user.id }
    socket.once('connect', emit)
    socket.connect()
  }
}

const TIME_SLOTS = getTimeSlots()

export default function ProposeDateModal({ conversationId, sessionId, juniorUsername, onClose }: Props) {
  const { user } = useAuth()

  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const canSend = !!selectedDay && !!selectedTime && !sending

  const calendarDays = getCalendarDays(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Empêche de naviguer avant le mois courant
  const canGoPrev = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth())

  const handleSend = () => {
    if (!canSend || !user) return
    setSending(true)

    const [h, m] = selectedTime!.split(':').map(Number)
    const proposedDate = new Date(selectedDay!)
    proposedDate.setHours(h, m, 0, 0)
    const display = formatDateFr(selectedDay!, selectedTime!)

    const body = JSON.stringify({
      sessionId,
      proposedAt: proposedDate.toISOString(),
      display,
      note: note.trim() || null,
    })

    sendViaSocket(conversationId, body, 'session_proposal', { token: user.token as string, id: user.id })
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
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
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
            Envoyé à <span className="font-medium text-foreground">{juniorUsername}</span> dans votre conversation.
          </p>

          {/* Calendrier */}
          <div className="border border-border rounded-xl p-3">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">
                {MONTHS_FR[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* En-têtes jours */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_SHORT.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grille de jours */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarDays.map((d, i) => {
                if (!d) return <div key={i} />

                const isPast = d < todayMidnight
                const isToday = d.toDateString() === todayMidnight.toDateString()
                const isSelected = selectedDay?.toDateString() === d.toDateString()

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                      isPast && 'text-muted-foreground/40 cursor-not-allowed',
                      !isPast && !isSelected && 'hover:bg-muted',
                      isToday && !isSelected && 'border border-primary/40 text-primary',
                      isSelected && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sélection de l'heure */}
          {selectedDay && (
            <div>
              <p className="text-sm font-medium mb-2">Heure</p>
              <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      selectedTime === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Récap + note */}
          {selectedDay && selectedTime && (
            <>
              <p className="text-sm text-center font-medium text-primary bg-primary/5 rounded-lg py-2 px-3">
                {formatDateFr(selectedDay, selectedTime)}
              </p>
              <div>
                <label htmlFor="propose-note" className="block text-sm font-medium mb-1">
                  Message complémentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <textarea
                  id="propose-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex : On commencera par les hooks React…"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
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
              disabled={!canSend}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
