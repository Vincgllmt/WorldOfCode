'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Clock, CheckCircle2, XCircle, AlertTriangle,
  MessageSquare, Calendar, Users, LayoutList,
  Globe, Target, ChevronRight, Plus, Zap, Code2,
  X, Video, AlignLeft, Layers, Link2, StickyNote, Trash2, Send,
} from 'lucide-react'
import { getMentoringRequestsMine, makeRequestPublic } from '@/lib/api/mentoring/requests'
import { getJuniorStats, type JuniorStats } from '@/lib/api/mentoring/junior'
import { getJuniorSessions } from '@/lib/api/mentoring/sessions'
import {
  getSessionNotes, createSessionNote, deleteSessionNote, type SessionNote,
} from '@/lib/api/mentoring/notes'
import { useAuth } from '@/hooks/useAuth'
import type { MentoringRequest, MentoringSession } from '@/types/mentoring'
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

  useEffect(() => {
    getSessionNotes(s.id).then(setNotes).catch(() => {})
  }, [s.id])

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
  const [stats, setStats] = useState<JuniorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selected, setSelected] = useState<MentoringSession | null>(null)

  const justCreated = searchParams.get('created') === '1'

  // kept in state so escalade from a request can still update data if needed
  const [, setRequests] = useState<MentoringRequest[]>([])
  const [, setMakePublicFn] = useState<((id: number) => Promise<void>) | null>(null)

  useEffect(() => {
    const escaladeFn = async (id: number) => {
      await makeRequestPublic(id)
      setRequests(prev => prev.map(r => r.id === id ? { ...r, isPublic: true } : r))
    }
    setMakePublicFn(() => escaladeFn)

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

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto">
            {sessionGroups.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Aucune session pour l&apos;instant.
                </p>
                <Link href="/mentoring/new" className="text-sm text-primary underline">
                  Créez une demande de mentorat
                </Link>
              </div>
            ) : (
              <div className="px-3 py-3 space-y-4">
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
                            selected={selected?.id === s.id}
                            onClick={() => setSelected(prev => prev?.id === s.id ? null : s)}
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
          {selected ? (
            <SessionDetailPanel
              session={selected}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <ChevronRight className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm">Sélectionnez une session pour voir les détails</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom sheet */}
      {selected && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => setSelected(null)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-background rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <SessionDetailPanel
              session={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
