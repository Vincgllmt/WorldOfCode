'use client'

import { useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, X, AlignLeft, Video, Layers } from 'lucide-react'
import { createSessionAppointment, refuseSessionAppointment } from '@/lib/api/mentoring/appointments'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import type { SessionAppointment, SessionFormat } from '@/types/mentoring'
import { cn } from '@/lib/utils'

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const FORMAT_OPTIONS: { value: SessionFormat; label: string; Icon: React.ElementType }[] = [
  { value: 'text', label: 'Texte', Icon: AlignLeft },
  { value: 'video', label: 'Vidéo', Icon: Video },
  { value: 'hybrid', label: 'Hybride', Icon: Layers },
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

interface Props {
  sessionId: number
  originalAppointmentId: number
  conversationId: string
  defaultFormat: SessionFormat
  onClose: () => void
  onCreated: (newAppt: SessionAppointment) => void
}

export default function AppointmentCounterModal({
  sessionId,
  originalAppointmentId,
  conversationId,
  defaultFormat,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth()
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [format, setFormat] = useState<SessionFormat>(defaultFormat)
  const [submitting, setSubmitting] = useState(false)

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
    if (!selectedDay || !selectedTime || submitting) return
    setSubmitting(true)
    try {
      const [h, m] = selectedTime.split(':').map(Number)
      const d = new Date(selectedDay)
      d.setHours(h, m, 0, 0)
      const scheduledAt = d.toISOString()

      // Refuse original appointment then create counter-proposal
      await refuseSessionAppointment(sessionId, originalAppointmentId).catch(() => {})
      const newAppt = await createSessionAppointment(sessionId, { scheduledAt, format })

      // Send socket message so it appears in chat too
      if (user) {
        const display = d.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
        const body = JSON.stringify({
          sessionId,
          appointmentId: newAppt.id,
          proposedAt: scheduledAt,
          display,
        })
        const emit = () => {
          socket.emit('join_conversation', { conversation_id: conversationId })
          socket.emit('send_message', {
            conversation_id: conversationId,
            temp_id: Date.now().toString(),
            body,
            type: 'appointment_proposal',
          })
        }
        if (socket.connected) emit()
        else {
          socket.auth = { token: user.token, userId: user.id }
          socket.once('connect', emit)
          socket.connect()
        }
      }

      onCreated(newAppt)
      onClose()
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
      aria-labelledby="appt-counter-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            <h2 id="appt-counter-title" className="font-semibold">Proposer une autre date</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Le rendez-vous précédent sera refusé et votre contre-proposition apparaîtra dans le cockpit du mentor.
          </p>

          {/* Calendrier */}
          <div className="border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} disabled={!canGoPrev}
                className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Mois précédent">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{MONTHS_FR[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-muted transition-colors" aria-label="Mois suivant">
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
                  <button key={i} type="button" disabled={isPast}
                    onClick={() => { setSelectedDay(d); setSelectedTime(null) }}
                    className={cn(
                      'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                      isPast && 'text-muted-foreground/40 cursor-not-allowed',
                      !isPast && !isSelected && 'hover:bg-muted',
                      isToday && !isSelected && 'border border-amber-500/40 text-amber-500',
                      isSelected && 'bg-amber-500 text-white',
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
                  <button key={t} type="button" onClick={() => setSelectedTime(t)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      selectedTime === t
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-border hover:border-amber-500/50 hover:bg-muted/50',
                    )}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* Format */}
          <div>
            <p className="text-sm font-medium mb-2">Format</p>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map(({ value, label, Icon }) => (
                <button key={value} type="button" onClick={() => setFormat(value)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                    format === value
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-border text-muted-foreground hover:border-amber-500/40',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {dateSummary && (
            <p className="text-sm text-center font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-3">
              {dateSummary}
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" onClick={handleSubmit}
              disabled={submitting || !selectedDay || !selectedTime}
              className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-amber-500/90 transition-colors">
              {submitting ? 'Envoi…' : 'Proposer cette date'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
