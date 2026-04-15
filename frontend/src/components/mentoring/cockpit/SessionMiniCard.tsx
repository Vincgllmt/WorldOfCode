'use client'

import { useState } from 'react'
import CloseSessionModal from './CloseSessionModal'
import type { MentoringSession } from '@/types/mentoring'

const STATUS_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  scheduled:   { label: 'Planifiée',  icon: '📅', className: 'text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'En cours',   icon: '▶️',  className: 'text-green-600 dark:text-green-400' },
}

interface Props {
  session: MentoringSession
  onStart?: (id: number) => void
  onComplete?: (id: number) => void
}

export default function SessionMiniCard({ session, onStart, onComplete }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  const config = STATUS_CONFIG[session.status] ?? { label: session.status, icon: '●', className: 'text-muted-foreground' }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar junior */}
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
        {session.junior.username[0]?.toUpperCase()}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.junior.username}</p>
        <p className={`text-xs flex items-center gap-0.5 ${config.className}`}>
          <span aria-hidden="true">{config.icon}</span>
          <span>{config.label}</span>
        </p>
      </div>

      {/* Action contextuelle */}
      {session.status === 'scheduled' && onStart && (
        <button
          onClick={() => onStart(session.id)}
          className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          aria-label={`Démarrer la session avec ${session.junior.username}`}
        >
          Démarrer
        </button>
      )}
      {session.status === 'in_progress' && (
        <>
          {session.conversationId && (
            <a
              href={`/message/${session.conversationId}`}
              className="text-xs px-2 py-0.5 bg-muted rounded hover:bg-muted/70 transition-colors"
              aria-label={`Ouvrir le chat avec ${session.junior.username}`}
            >
              Chat
            </a>
          )}
          {onComplete && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
              aria-label={`Clôturer la session avec ${session.junior.username}`}
            >
              Clôturer
            </button>
          )}
        </>
      )}

      {showCloseModal && (
        <CloseSessionModal
          sessionId={session.id}
          juniorUsername={session.junior.username}
          onClose={() => setShowCloseModal(false)}
          onCompleted={() => {
            setShowCloseModal(false)
            onComplete?.(session.id)
          }}
        />
      )}
    </div>
  )
}
