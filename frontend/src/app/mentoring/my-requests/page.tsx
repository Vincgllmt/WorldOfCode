'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Clock, CheckCircle2, XCircle, AlertTriangle,
  MessageSquare, Calendar, Users, LayoutList,
  Globe, Target, ChevronRight, Plus, Zap, Code2,
  X, Video, AlignLeft, Layers, Link2, StickyNote, Trash2, Send,
  Bookmark, Ban, ArrowUpRight, CalendarClock, Check,
} from 'lucide-react'
import { getMentoringRequestsMine, makeRequestPublic, cancelMentoringRequest } from '@/lib/api/mentoring/requests'
import { getJuniorStats, type JuniorStats } from '@/lib/api/mentoring/junior'
import { getJuniorSessions } from '@/lib/api/mentoring/sessions'
import {
  getSessionNotes, createSessionNote, deleteSessionNote, type SessionNote,
} from '@/lib/api/mentoring/notes'
import { useAuth } from '@/hooks/useAuth'
import type { MentoringRequest, MentoringSession, SessionAppointment } from '@/types/mentoring'
import { getSessionAppointments, confirmSessionAppointment, refuseSessionAppointment } from '@/lib/api/mentoring/appointments'
import AppointmentCounterModal from '@/components/mentoring/request/AppointmentCounterModal'
import { cn } from '@/lib/utils'

// ─── Config ──────────────────────────────────────────────────────────────────

const SESSION_STATUS_CONFIG: Record<string, {
  label: string
  Icon: React.ElementType
  badge: string
  row: string
  dot?: string
  accent?: string
}> = {
  scheduled: {
    label: 'Planifiée',
    Icon: Calendar,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    row: 'border-l-blue-400',
    dot: 'bg-blue-400',
    accent: 'text-blue-500',
  },
  in_progress: {
    label: 'En cours',
    Icon: Zap,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    row: 'border-l-green-400',
    dot: 'bg-green-400',
    accent: 'text-green-500',
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

const REQUEST_STATUS_CONFIG: Record<string, {
  label: string
  Icon: React.ElementType
  badge: string
  row: string
  dot?: string
  accent?: string
}> = {
  pending: {
    label: 'En attente',
    Icon: Clock,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    row: 'border-l-amber-400',
    dot: 'bg-amber-400',
    accent: 'text-amber-500',
  },
  pinned: {
    label: 'Épinglée',
    Icon: Bookmark,
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    row: 'border-l-violet-400',
    dot: 'bg-violet-400',
    accent: 'text-violet-500',
  },
  cancelled: {
    label: 'Annulée',
    Icon: XCircle,
    badge: 'bg-muted text-muted-foreground',
    row: 'border-l-border',
    accent: 'text-muted-foreground',
  },
  expired: {
    label: 'Expirée',
    Icon: AlertTriangle,
    badge: 'bg-muted text-muted-foreground',
    row: 'border-l-border',
    accent: 'text-muted-foreground',
  },
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  debug: 'Débogage',
  one_to_one: 'One-to-one',
  exercise: 'Exercice',
  code_review: 'Code review',
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = value >= i
        const half = !filled && value >= i - 0.5
        return (
          <span key={i} className="relative inline-block leading-none text-2xl">
            <span className="text-muted-foreground/30">★</span>
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden text-yellow-400"
                style={{ width: filled ? '100%' : '50%' }}
              >★</span>
            )}
          </span>
        )
      })}
    </span>
  )
}

// ─── Stats section ────────────────────────────────────────────────────────────

function JuniorStatsSection({ stats }: { stats: JuniorStats }) {
  const metrics = [
    { label: 'Sessions actives', value: stats.activeSessions, Icon: Zap, accent: 'text-green-500' },
    { label: 'Sessions terminées', value: stats.completedSessions, Icon: CheckCircle2, accent: 'text-primary' },
    { label: 'Mentors', value: stats.totalMentors, Icon: Users, accent: 'text-violet-500' },
    { label: 'Demandes', value: stats.totalRequests, Icon: LayoutList, accent: 'text-amber-500' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-muted/40 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium">Note reçue</p>
          <p className="text-sm font-semibold tabular-nums">
            {stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—'}
          </p>
        </div>
        {stats.averageRating !== null
          ? <Stars value={stats.averageRating} />
          : <p className="text-xs text-muted-foreground">Aucune note reçue pour l&apos;instant</p>
        }
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="bg-muted/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <m.Icon className={cn('h-3.5 w-3.5', m.accent)} />
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
            <p className="text-xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
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
        'w-full text-left border border-border border-l-4 rounded-r-xl px-4 py-3 transition-all bg-card hover:bg-muted/50',
        cfg.row,
        selected && 'bg-primary/5 border-primary/20 border-l-primary',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Mentor + live indicator */}
          <div className="flex items-center gap-1.5 mb-1">
            {cfg.dot && s.status !== 'completed' && (
              <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot, s.status === 'in_progress' && 'animate-pulse')} />
            )}
            <p className="font-medium text-sm truncate">
              {req?.title ?? `Session avec ${s.mentor.username}`}
            </p>
          </div>

          {/* Tech + format + targeted */}
          <div className="flex items-center gap-2 flex-wrap">
            {req?.techStack && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Code2 className="h-3 w-3" />
                {req.techStack}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FmtIcon className="h-3 w-3" />
              {FORMAT_LABELS[s.format] ?? s.format}
            </span>
            {req && !req.isPublic && (
              <span className="flex items-center gap-1 text-xs text-violet-500">
                <Target className="h-3 w-3" />
                Ciblée
              </span>
            )}
            {req?.isPublic && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Globe className="h-3 w-3" />
                Publique
              </span>
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

        {/* Status badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.badge)}>
            <cfg.Icon className="h-3 w-3" />
            {cfg.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{s.mentor.username}</span>
        </div>
      </div>
    </button>
  )
}

// ─── Request row ─────────────────────────────────────────────────────────────

function RequestRow({
  request: r,
  selected,
  onClick,
}: {
  request: MentoringRequest
  selected: boolean
  onClick: () => void
}) {
  const cfg = REQUEST_STATUS_CONFIG[r.status] ?? REQUEST_STATUS_CONFIG.pending

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left border border-border border-l-4 rounded-r-xl px-4 py-3 transition-all bg-card hover:bg-muted/50',
        cfg.row,
        selected && 'bg-primary/5 border-primary/20 border-l-primary',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {cfg.dot && (
              <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
            )}
            <p className="font-medium text-sm truncate">{r.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {REQUEST_TYPE_LABELS[r.type] ?? r.type}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Code2 className="h-3 w-3" />
              {r.techStack}
            </span>
            {!r.isPublic && (
              <span className="flex items-center gap-1 text-xs text-violet-500">
                <Target className="h-3 w-3" />
                Ciblée
              </span>
            )}
            {r.isPublic && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Globe className="h-3 w-3" />
                Publique
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0', cfg.badge)}>
          <cfg.Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>
    </button>
  )
}

// ─── Request detail panel ─────────────────────────────────────────────────────

function RequestDetailPanel({
  request: r,
  onCancel,
  onEscalade,
}: {
  request: MentoringRequest
  onCancel: (id: number) => void
  onEscalade: (id: number) => void
}) {
  const cfg = REQUEST_STATUS_CONFIG[r.status] ?? REQUEST_STATUS_CONFIG.pending
  const [cancelling, setCancelling] = useState(false)
  const [escalading, setEscalading] = useState(false)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelMentoringRequest(r.id)
      onCancel(r.id)
    } catch {
      // silent
    } finally {
      setCancelling(false)
    }
  }

  const handleEscalade = async () => {
    setEscalading(true)
    try {
      await makeRequestPublic(r.id)
      onEscalade(r.id)
    } catch {
      // silent
    } finally {
      setEscalading(false)
    }
  }

  const canCancel = r.status === 'pending' || r.status === 'pinned'
  const canEscalade = !r.isPublic && (r.status === 'pending' || r.status === 'pinned')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base leading-tight">{r.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.badge)}>
              <cfg.Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {REQUEST_TYPE_LABELS[r.type] ?? r.type}
            </span>
            {!r.isPublic
              ? <span className="flex items-center gap-1 text-xs text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full"><Target className="h-3 w-3" />Ciblée</span>
              : <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Globe className="h-3 w-3" />Publique</span>
            }
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Meta */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Détails</p>
          <TimelineItem label="Soumise le" Icon={Clock}
            value={new Date(r.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          />
          <div className="flex items-start gap-3">
            <Code2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Technologies</p>
              <p className="text-sm">{r.techStack}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-xl px-4 py-3">
            {r.description}
          </p>
        </div>

        {/* Contextual fields */}
        {r.blockedSince && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bloqué depuis</p>
            <p className="text-sm text-foreground/80">{r.blockedSince}</p>
          </div>
        )}
        {r.alreadyTried && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Déjà essayé</p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.alreadyTried}</p>
          </div>
        )}
        {r.expectedBehavior && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comportement attendu</p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.expectedBehavior}</p>
          </div>
        )}
        {r.observedBehavior && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comportement observé</p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.observedBehavior}</p>
          </div>
        )}
        {r.codeSnippet && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code partagé</p>
              {r.codeLanguage && (
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                  {r.codeLanguage}
                </span>
              )}
            </div>
            <pre className="text-xs font-mono bg-muted/60 border border-border rounded-xl px-4 py-3 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{r.codeSnippet}</code>
            </pre>
          </div>
        )}

        {/* Pinned info */}
        {r.status === 'pinned' && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 flex items-start gap-3">
            <Bookmark className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-400">Un mentor est intéressé</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Un mentor a épinglé votre demande et va bientôt vous contacter.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {(canEscalade || canCancel) && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</p>
            {canEscalade && (
              <button
                type="button"
                onClick={handleEscalade}
                disabled={escalading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                {escalading ? 'Escalade en cours…' : 'Rendre publique (élargir la recherche)'}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                {cancelling ? 'Annulation…' : 'Annuler la demande'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Session detail panel ─────────────────────────────────────────────────────

function SessionDetailPanel({
  session: s,
  onClose,
}: {
  session: MentoringSession
  onClose: () => void
}) {
  const { user } = useAuth()
  const cfg = SESSION_STATUS_CONFIG[s.status] ?? SESSION_STATUS_CONFIG.completed
  const FmtIcon = FORMAT_ICONS[s.format] ?? AlignLeft
  const req = s.request

  const [notes, setNotes] = useState<SessionNote[]>([])
  const [noteType, setNoteType] = useState<'note' | 'link'>('note')
  const [input, setInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [appointments, setAppointments] = useState<SessionAppointment[]>([])
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [refusingId, setRefusingId] = useState<number | null>(null)
  const [counterApptId, setCounterApptId] = useState<number | null>(null)

  useEffect(() => {
    setNotes([])
    setAppointments([])
    getSessionNotes(s.id).then(setNotes).catch(() => {})
    getSessionAppointments(s.id).then(setAppointments).catch(() => {})
  }, [s.id])

  const handleConfirm = async (appointmentId: number) => {
    setConfirmingId(appointmentId)
    try {
      const updated = await confirmSessionAppointment(s.id, appointmentId)
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a))
    } catch {
      // silent
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRefuse = async (appointmentId: number) => {
    setRefusingId(appointmentId)
    try {
      const updated = await refuseSessionAppointment(s.id, appointmentId)
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a))
    } catch {
      // silent
    } finally {
      setRefusingId(null)
    }
  }

  useEffect(() => {
    if (showForm) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [showForm])

  const handleSubmit = async () => {
    const content = input.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const note = await createSessionNote(s.id, { content, type: noteType })
      setNotes(prev => [...prev, note])
      setInput('')
      setShowForm(false)
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noteId: number) => {
    try {
      await deleteSessionNote(s.id, noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base leading-tight">
            {req?.title ?? `Session avec ${s.mentor.username}`}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.badge)}>
              <cfg.Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <FmtIcon className="h-3 w-3" />
              {FORMAT_LABELS[s.format] ?? s.format}
            </span>
            {req && !req.isPublic && (
              <span className="flex items-center gap-1 text-xs text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">
                <Target className="h-3 w-3" />
                Ciblée
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Mentor + meta */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary select-none shrink-0">
            {s.mentor.username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">{s.mentor.username}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {req?.techStack && (
                <span className="flex items-center gap-1"><Code2 className="h-3 w-3" />{req.techStack}</span>
              )}
              {req && (
                req.isPublic
                  ? <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Publique</span>
                  : <span className="flex items-center gap-1 text-violet-500"><Target className="h-3 w-3" />Ciblée</span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Chronologie</p>
          <TimelineItem label="Créée" Icon={Clock}
            value={new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
          {s.scheduledAt && (
            <TimelineItem label="Planifiée" Icon={Calendar} accent="text-blue-500"
              value={new Date(s.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            />
          )}
          {s.startedAt && (
            <TimelineItem label="Démarrée" Icon={Zap} accent="text-green-500"
              value={new Date(s.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            />
          )}
          {s.completedAt && (
            <TimelineItem label="Clôturée" Icon={CheckCircle2} accent="text-muted-foreground"
              value={new Date(s.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            />
          )}
        </div>

        {/* Chat */}
        {s.conversationId ? (
          <Link
            href={`/message/${s.conversationId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ouvrir le chat
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2 bg-muted/40 rounded-lg">
            En attente de confirmation de date par votre mentor.
          </p>
        )}

        {/* ── Rendez-vous ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rendez-vous
              {appointments.length > 0 && <span className="ml-1.5 font-normal normal-case">({appointments.length})</span>}
            </p>
          </div>

          {appointments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">
              Aucun rendez-vous proposé pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.map(a => {
                const date = new Date(a.scheduledAt)
                const isPast = date < new Date()
                const busy = confirmingId === a.id || refusingId === a.id
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'rounded-xl border border-border bg-card px-3 py-2.5 space-y-2',
                      isPast && a.status === 'pending' && 'opacity-60',
                      a.status === 'pending' && 'border-amber-500/40 bg-amber-500/5',
                      a.status === 'refused' && 'opacity-50',
                    )}
                  >
                    {/* Date + format + statut */}
                    <div className="flex items-start gap-2.5">
                      <Calendar className={cn(
                        'h-3.5 w-3.5 shrink-0 mt-0.5',
                        a.status === 'pending' ? 'text-amber-500'
                          : a.status === 'confirmed' ? 'text-blue-500'
                          : 'text-muted-foreground',
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {FORMAT_LABELS[a.format] ?? a.format}
                          </p>
                          {a.status === 'pending' && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              En attente
                            </span>
                          )}
                          {a.status === 'confirmed' && (
                            <span className="text-[10px] font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              Confirmé
                            </span>
                          )}
                          {a.status === 'refused' && (
                            <span className="text-[10px] font-medium text-destructive/70 flex items-center gap-0.5">
                              <X className="h-3 w-3" />
                              Refusé
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions pour les RDV en attente */}
                    {a.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-wrap pl-6">
                        <button
                          type="button"
                          onClick={() => handleConfirm(a.id)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50 font-medium"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {confirmingId === a.id ? '…' : 'Confirmer'}
                        </button>
                        {s.conversationId && (
                          <button
                            type="button"
                            onClick={() => setCounterApptId(a.id)}
                            disabled={busy}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50 font-medium"
                          >
                            Autre date ?
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRefuse(a.id)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50 font-medium"
                        >
                          <X className="h-3.5 w-3.5" />
                          {refusingId === a.id ? '…' : 'Refuser'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Notes section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Notes &amp; liens
              {notes.length > 0 && <span className="ml-1.5 font-normal normal-case">({notes.length})</span>}
            </p>
            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}
          </div>

          {/* Add form */}
          {showForm && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              {/* Type toggle */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setNoteType('note')}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    noteType === 'note'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <StickyNote className="h-3 w-3" />
                  Note
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType('link')}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    noteType === 'link'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <Link2 className="h-3 w-3" />
                  Lien
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
                  if (e.key === 'Escape') { setShowForm(false); setInput('') }
                }}
                placeholder={noteType === 'link' ? 'https://…' : 'Votre note…'}
                rows={3}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
              />

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Ctrl+Entrée pour envoyer · Échap pour annuler</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setInput('') }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!input.trim() || submitting}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
              Aucune note pour l&apos;instant. Ajoutez des points importants de la session.
            </p>
          )}

          <div className="space-y-2">
            {notes.map(n => (
              <NoteItem
                key={n.id}
                note={n}
                isOwn={n.author.id === user?.id}
                onDelete={() => handleDelete(n.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modale contre-proposition rendez-vous */}
      {counterApptId !== null && s.conversationId && (
        <AppointmentCounterModal
          sessionId={s.id}
          originalAppointmentId={counterApptId}
          conversationId={s.conversationId}
          defaultFormat={s.format}
          onClose={() => setCounterApptId(null)}
          onCreated={(newAppt) => {
            setAppointments(prev =>
              prev
                .map(a => a.id === counterApptId ? { ...a, status: 'refused' as const } : a)
                .concat(newAppt)
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            )
            setCounterApptId(null)
          }}
        />
      )}
    </div>
  )
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{part}</a>
      : part
  )
}

function NoteItem({
  note: n,
  isOwn,
  onDelete,
}: {
  note: SessionNote
  isOwn: boolean
  onDelete: () => void
}) {
  const isLink = n.type === 'link'

  return (
    <div className="group flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className={cn(
        'mt-0.5 shrink-0 p-1 rounded-md',
        isLink ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500',
      )}>
        {isLink ? <Link2 className="h-3.5 w-3.5" /> : <StickyNote className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm whitespace-pre-wrap break-words">{linkify(n.content)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {n.author.username} · {new Date(n.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
      {isOwn && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function TimelineItem({
  label, value, Icon, accent = 'text-muted-foreground',
}: {
  label: string
  value: string
  Icon: React.ElementType
  accent?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', accent)} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyRequestsPage() {
  const searchParams = useSearchParams()
  const [sessions, setSessions] = useState<MentoringSession[]>([])
  const [requests, setRequests] = useState<MentoringRequest[]>([])
  const [stats, setStats] = useState<JuniorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedSession, setSelectedSession] = useState<MentoringSession | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<MentoringRequest | null>(null)

  const justCreated = searchParams.get('created') === '1'

  useEffect(() => {
    Promise.all([
      getMentoringRequestsMine(),
      getJuniorSessions(),
      getJuniorStats(),
    ])
      .then(([reqs, sess, s]) => {
        setRequests(reqs)
        setSessions(sess)
        setStats(s)
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleCancelRequest = (id: number) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r))
    if (selectedRequest?.id === id) setSelectedRequest(prev => prev ? { ...prev, status: 'cancelled' } : null)
  }

  const handleEscaladeRequest = (id: number) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, isPublic: true } : r))
    if (selectedRequest?.id === id) setSelectedRequest(prev => prev ? { ...prev, isPublic: true } : null)
  }

  const pendingRequestGroups: { key: string; label: string; items: MentoringRequest[] }[] = [
    { key: 'pinned', label: 'Épinglées', items: requests.filter(r => r.status === 'pinned') },
    { key: 'pending', label: 'En attente', items: requests.filter(r => r.status === 'pending') },
  ].filter(g => g.items.length > 0)

  const sessionGroups: { key: string; label: string; items: MentoringSession[] }[] = [
    { key: 'in_progress', label: 'En cours', items: sessions.filter(s => s.status === 'in_progress') },
    { key: 'scheduled', label: 'Planifiées', items: sessions.filter(s => s.status === 'scheduled') },
    { key: 'completed', label: 'Clôturées', items: sessions.filter(s => s.status === 'completed') },
    { key: 'cancelled', label: 'Annulées', items: sessions.filter(s => s.status === 'cancelled') },
  ].filter(g => g.items.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="p-6 text-destructive flex items-center gap-2" role="alert">
        <AlertTriangle className="h-4 w-4" />
        Impossible de charger vos données. Veuillez réessayer.
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - var(--navbar-height, 73px))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <h1 className="font-semibold text-lg">Mon espace junior</h1>
        <Link
          href="/mentoring/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Link>
      </header>

      {justCreated && (
        <div role="status" className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-700 dark:text-green-400 shrink-0">
          <CheckCircle2 className="h-4 w-4" />
          Votre demande a été soumise avec succès !
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-full md:w-[360px] lg:w-[400px] shrink-0 border-r border-border overflow-y-auto flex flex-col">
          {/* Stats */}
          {stats && (
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Mes statistiques</p>
              <JuniorStatsSection stats={stats} />
            </div>
          )}

          {/* Sessions + requests list */}
          <div className="flex-1 overflow-y-auto">
            {pendingRequestGroups.length === 0 && sessionGroups.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Aucune demande ni session pour l&apos;instant.
                </p>
                <Link href="/mentoring/new" className="text-sm text-primary underline">
                  Créez une demande de mentorat
                </Link>
              </div>
            ) : (
              <div className="px-3 py-3 space-y-4">
                {/* Pending / pinned requests */}
                {pendingRequestGroups.map(group => {
                  const groupCfg = REQUEST_STATUS_CONFIG[group.key]
                  return (
                    <div key={group.key}>
                      <div className="flex items-center gap-1.5 px-1 mb-2">
                        {groupCfg && (
                          <groupCfg.Icon className={cn('h-3.5 w-3.5', groupCfg.accent)} />
                        )}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.label}
                          <span className="ml-1.5 font-normal normal-case">({group.items.length})</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        {group.items.map(r => (
                          <RequestRow
                            key={r.id}
                            request={r}
                            selected={selectedRequest?.id === r.id}
                            onClick={() => {
                              setSelectedSession(null)
                              setSelectedRequest(prev => prev?.id === r.id ? null : r)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Sessions */}
                {sessionGroups.map(group => {
                  const groupCfg = SESSION_STATUS_CONFIG[group.key]
                  return (
                    <div key={group.key}>
                      <div className="flex items-center gap-1.5 px-1 mb-2">
                        {groupCfg && (
                          <groupCfg.Icon className={cn('h-3.5 w-3.5', groupCfg.accent)} />
                        )}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.label}
                          <span className="ml-1.5 font-normal normal-case">({group.items.length})</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        {group.items.map(s => (
                          <SessionRow
                            key={s.id}
                            session={s}
                            selected={selectedSession?.id === s.id}
                            onClick={() => {
                              setSelectedRequest(null)
                              setSelectedSession(prev => prev?.id === s.id ? null : s)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right detail panel */}
        <main className="flex-1 overflow-hidden hidden md:flex flex-col">
          {selectedSession ? (
            <SessionDetailPanel
              session={selectedSession}
              onClose={() => setSelectedSession(null)}
            />
          ) : selectedRequest ? (
            <RequestDetailPanel
              request={selectedRequest}
              onCancel={handleCancelRequest}
              onEscalade={handleEscaladeRequest}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <ChevronRight className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm">Sélectionnez une demande ou session pour voir les détails</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom sheet */}
      {(selectedSession || selectedRequest) && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => { setSelectedSession(null); setSelectedRequest(null) }}>
          <div
            className="absolute inset-x-0 bottom-0 bg-background rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {selectedSession ? (
              <SessionDetailPanel
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
              />
            ) : selectedRequest ? (
              <RequestDetailPanel
                request={selectedRequest}
                onCancel={handleCancelRequest}
                onEscalade={handleEscaladeRequest}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
