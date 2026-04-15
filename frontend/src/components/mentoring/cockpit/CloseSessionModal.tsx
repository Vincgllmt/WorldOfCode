'use client'

import { useState } from 'react'
import { completeSession } from '@/lib/api/mentoring/sessions'

interface Props {
  sessionId: number
  juniorUsername: string
  onClose: () => void
  onCompleted: () => void
}

export default function CloseSessionModal({ sessionId, juniorUsername, onClose, onCompleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = async () => {
    setLoading(true)
    setError(null)
    try {
      await completeSession(sessionId)
      onCompleted()
      onClose()
    } catch {
      setError('Une erreur est survenue lors de la clôture.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-session-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 id="close-session-title" className="text-lg font-semibold mb-2">
          Clôturer la session
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Vous êtes sur le point de clôturer la session avec{' '}
          <strong>{juniorUsername}</strong>. Cette action déclenchera la demande de notation pour les deux parties.
        </p>

        {error && (
          <p role="alert" className="text-destructive text-sm flex items-center gap-2 mb-4">
            <span aria-hidden="true">⚠️</span> {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Clôture en cours...' : '✓ Confirmer la clôture'}
          </button>
        </div>
      </div>
    </div>
  )
}
