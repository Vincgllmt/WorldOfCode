'use client'

import { useState } from 'react'
import { acceptRequest } from '@/lib/api/mentoring/requests'
import type { MentoringSession } from '@/types/mentoring'

const FORMAT_OPTIONS = [
  { value: 'text',   label: '💬 Texte — échange par messages' },
  { value: 'video',  label: '📹 Vidéo — appel vidéo' },
  { value: 'hybrid', label: '🔀 Hybride — texte + partage d\'écran' },
]

interface Props {
  requestId: number
  requestTitle: string
  onClose: () => void
  onAccepted: (session: MentoringSession) => void
}

export default function AcceptRequestModal({ requestId, requestTitle, onClose, onAccepted }: Props) {
  const [format, setFormat] = useState('text')
  const [conversationId, setConversationId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading(true)
    setError(null)
    try {
      const session = await acceptRequest(requestId, {
        format,
        conversationId: conversationId.trim() || undefined,
      })
      onAccepted(session as unknown as MentoringSession)
      onClose()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'REQUEST_ALREADY_ACCEPTED') {
        setError('Cette demande a déjà été acceptée par un autre mentor.')
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
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
      aria-labelledby="accept-modal-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 id="accept-modal-title" className="text-lg font-semibold mb-1">Accepter la demande</h2>
          <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{requestTitle}</p>

          {/* Format */}
          <div className="mb-4">
            <p className="block text-sm font-medium mb-2">Format de la session</p>
            <div className="space-y-2" role="radiogroup" aria-label="Format de session">
              {FORMAT_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conversation ID optionnel */}
          <div className="mb-6">
            <label htmlFor="conversationId" className="block text-sm font-medium mb-1">
              ID de conversation <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              id="conversationId"
              type="text"
              value={conversationId}
              onChange={e => setConversationId(e.target.value)}
              placeholder="ex: conv_abc123"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si vous avez déjà créé une conversation dans la messagerie, collez son ID ici.
            </p>
          </div>

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
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Acceptation...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
