'use client'

import type { MentoringSession } from '@/types/mentoring'

const STATUS_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  scheduled:   { label: 'Planifiée',  icon: '📅', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En cours',   icon: '▶️',  className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  completed:   { label: 'Terminée',   icon: '✓',   className: 'bg-muted text-muted-foreground' },
  cancelled:   { label: 'Annulée',    icon: '✗',   className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

const FORMAT_LABELS: Record<string, string> = {
  text: '💬 Texte', video: '📹 Vidéo', hybrid: '🔀 Hybride',
}

function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 60) return `${diffMin} min`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

interface Props {
  session: MentoringSession
  viewAs?: 'junior' | 'mentor'
}

export default function SessionCard({ session, viewAs = 'junior' }: Props) {
  const config = STATUS_CONFIG[session.status] ?? { label: session.status, icon: '●', className: 'bg-muted text-muted-foreground' }
  const partner = viewAs === 'junior' ? session.mentor : session.junior
  const duration = formatDuration(session.startedAt, session.completedAt)

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
              <span aria-hidden="true">{config.icon}</span>
              <span>{config.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">{FORMAT_LABELS[session.format] ?? session.format}</span>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">{viewAs === 'junior' ? 'Mentor : ' : 'Junior : '}</span>
            <span className="font-medium">{partner.username}</span>
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {session.completedAt && (
            <p>{new Date(session.completedAt).toLocaleDateString('fr-FR')}</p>
          )}
          {duration && <p className="font-medium">{duration}</p>}
        </div>
      </div>

      {session.conversationId && session.status !== 'cancelled' && (
        <a
          href={`/message/${session.conversationId}`}
          className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <span aria-hidden="true">💬</span>
          Ouvrir le chat
        </a>
      )}
    </div>
  )
}
