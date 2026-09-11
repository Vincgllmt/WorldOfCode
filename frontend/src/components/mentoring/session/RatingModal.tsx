'use client'

import { useState } from 'react'
import { submitRating } from '@/lib/api/mentoring/ratings'

interface StarRatingProps {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}

function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0)

  return (
    <div
      className="flex gap-1"
      role={readonly ? 'img' : 'group'}
      aria-label={readonly ? `Note : ${value} sur 5` : 'Sélectionner une note de 1 à 5 étoiles'}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          aria-label={readonly ? undefined : `${star} étoile${star > 1 ? 's' : ''}`}
          aria-pressed={!readonly ? value >= star : undefined}
          className={`text-3xl transition-colors disabled:cursor-default ${
            (hover || value) >= star ? 'text-yellow-400' : 'text-muted-foreground/30'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Très décevant',
  2: 'Décevant',
  3: 'Correct',
  4: 'Très bien',
  5: 'Excellent !',
}

interface Props {
  sessionId: number
  partnerUsername: string
  onClose: () => void
  onSubmitted: () => void
  /** Le partenaire (mentor) accepte les dons : on propose de le soutenir après la note. */
  canDonate?: boolean
  /** Ouvre le flux de don (le parent ferme cette modale et affiche DonationModal). */
  onDonate?: () => void
}

export default function RatingModal({
  sessionId,
  partnerUsername,
  onClose,
  onSubmitted,
  canDonate = false,
  onDonate,
}: Props) {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (score === 0) {
      setError('Veuillez sélectionner une note de 1 à 5 étoiles.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await submitRating(sessionId, { score, comment: comment.trim() || undefined })
      setSuccess(true)
      // Sans proposition de don : fermeture auto. Sinon on laisse le junior choisir.
      if (!canDonate) {
        setTimeout(() => {
          onSubmitted()
          onClose()
        }, 2000)
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Une erreur est survenue.')
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
      aria-labelledby="rating-modal-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        {success ? (
          <div className="text-center py-4" role="status">
            <p className="text-3xl mb-3" aria-hidden="true">✓</p>
            <p className="font-medium">Votre note a été enregistrée.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Elle sera visible quand votre partenaire aura également noté.
            </p>

            {canDonate && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm mb-4">
                  Envie de remercier <strong>{partnerUsername}</strong> du temps qu&apos;il vous a consacré ?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { onSubmitted(); onClose() }}
                    className="flex-1 border border-border rounded-lg py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    Plus tard
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSubmitted(); onDonate?.() }}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium"
                  >
                    Soutenir votre mentor
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <h2 id="rating-modal-title" className="text-lg font-semibold mb-1">
              Notez votre session
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Comment s&apos;est passée la session avec <strong>{partnerUsername}</strong> ?
            </p>

            {/* Étoiles */}
            <div className="mb-6 flex flex-col items-center gap-2">
              <StarRating value={score} onChange={setScore} />
              {score > 0 && (
                <p className="text-sm text-muted-foreground">{SCORE_LABELS[score]}</p>
              )}
            </div>

            {/* Commentaire */}
            <div className="mb-6">
              <label htmlFor="rating-comment" className="block text-sm font-medium mb-1">
                Commentaire <span className="text-muted-foreground font-normal">(optionnel, max 500 caractères)</span>
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Décrivez votre expérience..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-0.5">{comment.length}/500</p>
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
                onClick={handleSubmit}
                disabled={loading || score === 0}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Soumettre ma note'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
