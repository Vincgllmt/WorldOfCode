'use client'

import { CalendarDays } from 'lucide-react'
import type { MentoringSession } from '@/types/mentoring'

interface Props {
  sessions: MentoringSession[]
}

const FORMAT_LABEL: Record<string, string> = {
  text:   'Texte',
  video:  'Vidéo',
  hybrid: 'Hybride',
}

const FORMAT_DOT: Record<string, string> = {
  text:   'bg-blue-400',
  video:  'bg-violet-400',
  hybrid: 'bg-amber-400',
}

function formatScheduledAt(iso: string): { day: string; time: string } {
  const date = new Date(iso)
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  let day: string
  if (dateMidnight.getTime() === todayMidnight.getTime()) {
    day = "Aujourd'hui"
  } else if (dateMidnight.getTime() === tomorrowMidnight.getTime()) {
    day = 'Demain'
  } else {
    day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    day = day.charAt(0).toUpperCase() + day.slice(1)
  }

  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

export default function WeekAgenda({ sessions }: Props) {
  const now = new Date()

  const upcoming = sessions
    .filter(s => s.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

  const future = upcoming.filter(s => new Date(s.scheduledAt!) >= now)
  const past   = upcoming.filter(s => new Date(s.scheduledAt!) < now)

  // On affiche : tous les futurs + les passés du jour courant
  const displayed = [
    ...past.filter(s => {
      const d = new Date(s.scheduledAt!)
      return d.toDateString() === now.toDateString()
    }),
    ...future,
  ]

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Agenda
      </h3>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Aucun rendez-vous planifié</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(s => {
            const { day, time } = formatScheduledAt(s.scheduledAt!)
            const isPast = new Date(s.scheduledAt!) < now
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  isPast
                    ? 'border-border/50 bg-muted/20 opacity-60'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                {/* Heure */}
                <div className="text-center min-w-[40px]">
                  <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{day}</p>
                  <p className="text-sm font-semibold tabular-nums">{time}</p>
                </div>

                {/* Séparateur */}
                <div className="w-px h-8 bg-border shrink-0" />

                {/* Junior + format */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                      {s.junior.username[0]?.toUpperCase()}
                    </div>
                    <p className="text-xs font-medium truncate">{s.junior.username}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${FORMAT_DOT[s.format] ?? 'bg-muted-foreground'}`} />
                    <p className="text-[10px] text-muted-foreground">{FORMAT_LABEL[s.format] ?? s.format}</p>
                  </div>
                </div>

                {/* Lien chat */}
                {s.conversationId && (
                  <a
                    href={`/message/${s.conversationId}`}
                    className="text-[10px] text-primary hover:underline shrink-0"
                    aria-label={`Chat avec ${s.junior.username}`}
                  >
                    Chat
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
