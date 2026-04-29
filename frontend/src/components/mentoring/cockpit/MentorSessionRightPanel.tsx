'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Zap, CheckCircle2, XCircle, Clock,
  MessageSquare, Code2, Globe, Target,
  AlignLeft, Video, Layers,
  Plus, StickyNote, Link2, Send, Trash2,
  CalendarClock,
} from 'lucide-react'
import {
  getSessionNotes, createSessionNote, deleteSessionNote, type SessionNote,
} from '@/lib/api/mentoring/notes'
import {
  getSessionAppointments, deleteSessionAppointment,
} from '@/lib/api/mentoring/appointments'
import { useAuth } from '@/hooks/useAuth'
import type { MentoringSession, SessionAppointment } from '@/types/mentoring'
import { cn } from '@/lib/utils'
import FollowUpSessionModal from './FollowUpSessionModal'

const SESSION_STATUS_CONFIG: Record<string, {
  label: string
  Icon: React.ElementType
  badge: string
}> = {
  in_progress: {
    label: 'En cours',
    Icon: Zap,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  scheduled: {
    label: 'Planifiée',
    Icon: Calendar,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Clôturée',
    Icon: CheckCircle2,
    badge: 'bg-muted text-muted-foreground',
  },
  cancelled: {
    label: 'Annulée',
    Icon: XCircle,
    badge: 'bg-muted text-muted-foreground',
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

interface Props {
  session: MentoringSession
}

export default function MentorSessionRightPanel({ session: s }: Props) {
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
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)

  useEffect(() => {
    setNotes([])
    setAppointments([])
    getSessionNotes(s.id).then(setNotes).catch(() => {})
    getSessionAppointments(s.id).then(setAppointments).catch(() => {})
    setShowFollowUpModal(false)
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
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noteId: number) => {
    try {
      await deleteSessionNote(s.id, noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch {}
  }

  return (
    <>
      {showFollowUpModal && (
        <FollowUpSessionModal
          session={s}
          onClose={() => setShowFollowUpModal(false)}
          onCreated={(appt) => {
            setShowFollowUpModal(false)
            setAppointments(prev => [...prev, appt].sort(
              (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
            ))
          }}
        />
      )}

      <div className="p-4 space-y-5 overflow-y-auto h-full">

        {/* Header — junior + status */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
            {s.junior.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{s.junior.username}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.badge)}>
                <cfg.Icon className="h-3 w-3" />
                {cfg.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <FmtIcon className="h-3 w-3" />
                {FORMAT_LABELS[s.format] ?? s.format}
              </span>
            </div>
          </div>
        </div>

        {/* Request meta */}
        {req && (
          <div className="space-y-1">
            <p className="font-medium text-sm">{req.title}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Code2 className="h-3.5 w-3.5" />{req.techStack}</span>
              {req.isPublic
                ? <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Publique</span>
                : <span className="flex items-center gap-1 text-violet-500"><Target className="h-3.5 w-3.5" />Ciblée</span>
              }
            </div>
          </div>
        )}

        {/* Chat link */}
        {s.conversationId && (
          <Link
            href={`/message/${s.conversationId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ouvrir le chat
          </Link>
        )}

        {/* Timeline */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Chronologie</h4>
          <div className="space-y-2">
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
        </div>

        {/* Notes & liens */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes &amp; liens
              {notes.length > 0 && <span className="ml-1.5 font-normal normal-case">({notes.length})</span>}
            </h4>
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

          {showForm && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex gap-1.5">
                <TypeToggle active={noteType === 'note'} onClick={() => setNoteType('note')} Icon={StickyNote} label="Note" />
                <TypeToggle active={noteType === 'link'} onClick={() => setNoteType('link')} Icon={Link2} label="Lien" />
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
                <p className="text-[10px] text-muted-foreground">Ctrl+Entrée · Échap</p>
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

          {notes.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">
              Aucune note pour l&apos;instant.
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

        {/* Rendez-vous */}
        <div className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rendez-vous
              {appointments.length > 0 && <span className="ml-1.5 font-normal normal-case">({appointments.length})</span>}
            </h4>
            <button
              type="button"
              onClick={() => setShowFollowUpModal(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Planifier
            </button>
          </div>

          {appointments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">
              Aucun rendez-vous planifié.
            </p>
          )}

          <div className="space-y-2">
            {appointments.map(a => (
              <AppointmentItem
                key={a.id}
                appointment={a}
                onDelete={async () => {
                  await deleteSessionAppointment(s.id, a.id).catch(() => {})
                  setAppointments(prev => prev.filter(x => x.id !== a.id))
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

function TypeToggle({
  active, onClick, Icon, label,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ElementType
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-primary/40',
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
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
  note: n, isOwn, onDelete,
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

function AppointmentItem({
  appointment: a,
  onDelete,
}: {
  appointment: SessionAppointment
  onDelete: () => void
}) {
  const date = new Date(a.scheduledAt)
  const isPast = date < new Date()
  const isPending = a.status === 'pending'
  return (
    <div className={cn(
      'group flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5',
      isPast && !isPending && 'opacity-50',
      isPending && 'border-amber-500/40 bg-amber-500/5',
    )}>
      <Calendar className={cn(
        'h-3.5 w-3.5 shrink-0 mt-0.5',
        isPending ? 'text-amber-500' : isPast ? 'text-muted-foreground' : 'text-blue-500',
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground capitalize">{FORMAT_LABELS[a.format] ?? a.format}</p>
          {isPending && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">En attente</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 mt-0.5"
        aria-label="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
