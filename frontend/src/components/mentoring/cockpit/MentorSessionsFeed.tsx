'use client'

import { useEffect, useState } from 'react'
import {
  Calendar, Zap, CheckCircle2, XCircle, Code2,
  AlignLeft, Video, Layers, Target, Globe,
} from 'lucide-react'
import { getMentorAllSessions } from '@/lib/api/mentoring/sessions'
import type { MentoringSession } from '@/types/mentoring'
import { cn } from '@/lib/utils'

const SESSION_STATUS_CONFIG: Record<string, {
  label: string
  Icon: React.ElementType
  badge: string
  row: string
  dot?: string
  accent: string
}> = {
  in_progress: {
    label: 'En cours',
    Icon: Zap,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    row: 'border-l-green-400',
    dot: 'bg-green-400',
    accent: 'text-green-500',
  },
  scheduled: {
    label: 'Planifiée',
    Icon: Calendar,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    row: 'border-l-blue-400',
    dot: 'bg-blue-400',
    accent: 'text-blue-500',
  },
  completed: {
    label: 'Clôturée',
    Icon: CheckCircle2,
    badge: 'bg-muted text-muted-foreground',
    row: 'border-l-border',
    accent: 'text-muted-foreground',
  },
  cancelled: {
    label: 'Annulée',
    Icon: XCircle,
    badge: 'bg-muted text-muted-foreground',
    row: 'border-l-border',
    accent: 'text-muted-foreground',
  },
}

const FORMAT_ICONS: Record<string, React.ElementType> = {
  text: AlignLeft,
  video: Video,
  hybrid: Layers,
}

const FORMAT_LABELS: Record<string, string> = {
  text: 'Texte',
  video: 'Vidéo',
  hybrid: 'Hybride',
}

const GROUP_ORDER = ['in_progress', 'scheduled', 'completed', 'cancelled']

interface Props {
  selectedSessionId: number | null
  onSelectSession: (s: MentoringSession) => void
}

export default function MentorSessionsFeed({ selectedSessionId, onSelectSession }: Props) {
  const [sessions, setSessions] = useState<MentoringSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [techFilter, setTechFilter] = useState<string | null>(null)

  useEffect(() => {
    getMentorAllSessions()
      .then(setSessions)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const techs = Array.from(
    new Set(sessions.map(s => s.request?.techStack).filter(Boolean) as string[])
  ).sort()

  const filtered = techFilter
    ? sessions.filter(s => s.request?.techStack === techFilter)
    : sessions

  const groups = GROUP_ORDER
    .map(key => ({ key, cfg: SESSION_STATUS_CONFIG[key], items: filtered.filter(s => s.status === key) }))
    .filter(g => g.items.length > 0)

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive flex items-center gap-2">
        <span aria-hidden>⚠️</span> Impossible de charger les sessions.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tech filter bar */}
      {techs.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur px-6 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTechFilter(null)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition-colors',
              techFilter === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            Toutes
          </button>
          {techs.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTechFilter(t === techFilter ? null : t)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                techFilter === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {groups.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {techFilter ? `Aucune session en ${techFilter}.` : 'Aucune session pour le moment.'}
          </p>
        )}

        {groups.map(({ key, cfg, items }) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <cfg.Icon className={cn('h-4 w-4', cfg.accent)} />
              <h3 className={cn('text-xs font-semibold uppercase tracking-wide', cfg.accent)}>
                {cfg.label}
                <span className="ml-1.5 font-normal normal-case text-muted-foreground">({items.length})</span>
              </h3>
            </div>
            <div className="space-y-2">
              {items.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  selected={s.id === selectedSessionId}
                  onClick={() => onSelectSession(s)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionCard({
  session: s,
  selected,
  onClick,
}: {
  session: MentoringSession
  selected: boolean
  onClick: () => void
}) {
  const cfg = SESSION_STATUS_CONFIG[s.status] ?? SESSION_STATUS_CONFIG.completed
  const FmtIcon = FORMAT_ICONS[s.format] ?? AlignLeft
  const req = s.request

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left border border-border border-l-4 rounded-xl px-4 py-3 transition-all bg-card hover:bg-muted/50',
        cfg.row,
        selected && 'bg-primary/5 border-primary/20 border-l-primary',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Junior name + live dot */}
          <div className="flex items-center gap-1.5 mb-1">
            {cfg.dot && (
              <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot, s.status === 'in_progress' && 'animate-pulse')} />
            )}
            <p className="font-medium text-sm truncate">
              {req?.title ?? `Session avec ${s.junior.username}`}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {/* Junior */}
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                {s.junior.username[0]?.toUpperCase()}
              </span>
              {s.junior.username}
            </span>

            {req?.techStack && (
              <span className="flex items-center gap-1">
                <Code2 className="h-3 w-3" />
                {req.techStack}
              </span>
            )}

            <span className="flex items-center gap-1">
              <FmtIcon className="h-3 w-3" />
              {FORMAT_LABELS[s.format] ?? s.format}
            </span>

            {req && (
              req.isPublic
                ? <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Publique</span>
                : <span className="flex items-center gap-1 text-violet-500"><Target className="h-3 w-3" />Ciblée</span>
            )}
          </div>

          {/* Scheduled date */}
          {s.scheduledAt && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(s.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>

        <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.badge)}>
          <cfg.Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>
    </button>
  )
}
