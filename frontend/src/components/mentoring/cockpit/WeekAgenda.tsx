'use client'

import type { MentoringSession } from '@/types/mentoring'

interface Props {
  sessions: MentoringSession[]
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' })
}

function getWeekDays(): Date[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // Lundi de la semaine courante
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function WeekAgenda({ sessions }: Props) {
  const weekDays = getWeekDays()
  const scheduled = sessions.filter(s => s.status === 'scheduled' && s.scheduledAt)

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Cette semaine
      </h3>
      <div className="grid grid-cols-7 gap-0.5" role="list" aria-label="Agenda de la semaine">
        {weekDays.map((day, i) => {
          const dayStr = day.toDateString()
          const sessionsOnDay = scheduled.filter(s =>
            s.scheduledAt && new Date(s.scheduledAt).toDateString() === dayStr
          )
          const isToday = day.toDateString() === new Date().toDateString()

          return (
            <div
              key={i}
              role="listitem"
              className={`flex flex-col items-center p-1 rounded text-xs ${
                isToday ? 'bg-primary/10 ring-1 ring-primary/30' : ''
              }`}
            >
              <span className="text-muted-foreground">{getDayName(day)}</span>
              <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</span>
              {sessionsOnDay.length > 0 && (
                <div
                  className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary"
                  aria-label={`${sessionsOnDay.length} session(s)`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
