'use client'

import { useState } from 'react'
import CloseSessionModal from './CloseSessionModal'
import ProposeDateModal from './ProposeDateModal'
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
  const [showProposeDateModal, setShowProposeDateModal] = useState(false)
  const config = STATUS_CONFIG[session.status] ?? { label: session.status, icon: '●', className: 'text-muted-foreground' }

  return (
    <div className="p-2 rounded-lg hover:bg-muted/50 transition-colors space-y-2">
      {/* Ligne 1 : avatar + nom + statut */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
          {session.junior.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{session.junior.username}</p>
          <p className={`text-xs flex items-center gap-0.5 ${config.className}`}>
            <span aria-hidden="true">{config.icon}</span>
            <span>{config.label}</span>
          </p>
        </div>
      </div>

      {/* Ligne 2 : actions */}
      {session.status === 'scheduled' && onStart && (
        <button
          onClick={() => onStart(session.id)}
          className="w-full text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          aria-label={`Démarrer la session avec ${session.junior.username}`}
        >
          Démarrer
        </button>
      )}
      {session.status === 'in_progress' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {session.conversationId && (
            <>
              <button
                onClick={() => setShowProposeDateModal(true)}
                className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                aria-label={`Proposer une date à ${session.junior.username}`}
              >
                📅 Planifier
              </button>
              <a
                href={`/message/${session.conversationId}`}
                className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/70 transition-colors"
                aria-label={`Ouvrir le chat avec ${session.junior.username}`}
              >
                Chat
              </a>
            </>
          )}
          {onComplete && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
              aria-label={`Clôturer la session avec ${session.junior.username}`}
            >
              Clôturer
            </button>
          )}
        </div>
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

      {showProposeDateModal && session.conversationId && (
        <ProposeDateModal
          conversationId={session.conversationId}
          sessionId={session.id}
          juniorUsername={session.junior.username}
          onClose={() => setShowProposeDateModal(false)}
        />
      )}
    </div>
  )
}
