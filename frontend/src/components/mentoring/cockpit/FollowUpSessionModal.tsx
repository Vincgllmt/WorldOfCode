'use client'

import { useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, X, AlignLeft, Video, Layers } from 'lucide-react'
import { createSessionAppointment } from '@/lib/api/mentoring/appointments'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import type { MentoringSession, SessionAppointment, SessionFormat } from '@/types/mentoring'
import { cn } from '@/lib/utils'

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
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

const TIME_SLOTS = getTimeSlots()

const FORMAT_OPTIONS: { value: SessionFormat; label: string; Icon: React.ElementType }[] = [
  { value: 'text', label: 'Texte', Icon: AlignLeft },
  { value: 'video', label: 'Vidéo', Icon: Video },
  { value: 'hybrid', label: 'Hybride', Icon: Layers },
]

interface Props {
  session: MentoringSession
  onClose: () => void
  onCreated: (appointment: SessionAppointment) => void
}

export default function FollowUpSessionModal({ session, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [format, setFormat] = useState<SessionFormat>(session.format)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const canGoPrev = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!selectedDay || !selectedTime) return
    setSubmitting(true)
    try {
      const [h, m] = selectedTime.split(':').map(Number)
      const d = new Date(selectedDay)
      d.setHours(h, m, 0, 0)
      const scheduledAt = d.toISOString()
      const appt = await createSessionAppointment(session.id, { scheduledAt, format })

      // Send socket proposal to the conversation (same flow as first scheduling)
      if (session.conversationId && user) {
        const display = d.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
        const body = JSON.stringify({
          sessionId: session.id,
          appointmentId: appt.id,
          proposedAt: scheduledAt,
          display,
        })
        const emit = () => {
          socket.emit('join_conversation', { conversation_id: session.conversationId })
          socket.emit('send_message', {
            conversation_id: session.conversationId,
            temp_id: Date.now().toString(),
            body,
            type: 'appointment_proposal',
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

      setSuccess(true)
      setTimeout(() => {
        onClose()
        onCreated(appt)
      }, 1200)
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false)
    }
  }

  const calendarDays = getCalendarDays(viewYear, viewMonth)

  const dateSummary = selectedDay && selectedTime
    ? (() => {
        const d = new Date(selectedDay)
        const [h, m] = selectedTime.split(':').map(Number)
        d.setHours(h, m, 0, 0)
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      })()
    : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-modal-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 id="follow-up-modal-title" className="font-semibold">Planifier une nouvelle session</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {success ? (
            <p className="text-sm text-center text-green-600 dark:text-green-400 font-medium py-6">
              Session planifiée avec succès.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Avec <span className="font-medium text-foreground">{session.junior.username}</span>
              </p>

              {/* Calendrier */}
              <div className="border border-border rounded-xl p-3">
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
                  <span className="text-sm font-semibold">{MONTHS_FR[viewMonth]} {viewYear}</span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAYS_SHORT.map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>

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
                        onClick={() => { setSelectedDay(d); setSelectedTime(null) }}
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

              {/* Heure */}
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
                            : 'border-border hover:border-primary/50 hover:bg-muted/50',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format */}
              <div>
                <p className="text-sm font-medium mb-2">Format</p>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormat(value)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                        format === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Récap date */}
              {dateSummary && (
                <p className="text-sm text-center font-medium text-primary bg-primary/5 rounded-lg py-2 px-3">
                  {dateSummary}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedDay || !selectedTime}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {submitting ? 'Création…' : 'Planifier le rendez-vous'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
