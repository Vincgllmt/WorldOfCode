'use client'

import { useState, useRef } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentoringRequestType } from '@/types/mentoring'

const TYPE_OPTIONS: { value: MentoringRequestType; label: string }[] = [
  { value: 'debug', label: '🐛 Debug — J\'ai un bug à résoudre' },
  { value: 'one_to_one', label: '💬 1-to-1 — J\'ai besoin d\'explications' },
  { value: 'exercise', label: '📝 Exercice — Je veux pratiquer' },
  { value: 'code_review', label: '🔍 Code Review — Relire mon code' },
]

interface MentorResult {
  id: number
  username: string
  mentorId: number
  specialties: string[]
  isAvailable: boolean
}

interface SummaryData {
  title: string
  description: string
  type: string
  isPublic: boolean
  targetMentorId?: number
}

interface Props {
  data: SummaryData
  onChange: (partial: Partial<SummaryData>) => void
  onPrev: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}

export default function StepSummary({ data, onChange, onPrev, onSubmit, submitting, error }: Props) {
  const [localErrors, setLocalErrors] = useState<{ title?: string; description?: string; targetMentor?: string }>({})
  const [mentorSearch, setMentorSearch] = useState('')
  const [mentorResults, setMentorResults] = useState<MentorResult[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const searchMentors = async (q: string) => {
    setMentorSearch(q)
    if (q.length < 2) { setMentorResults([]); return }
    // Annuler la requête précédente pour éviter les réponses hors-ordre
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      const res = await fetchWithAuth(
        `/api/users?isMentor=true&q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal }
      )
      if (res.ok) setMentorResults(await res.json() as MentorResult[])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Erreur réseau silencieuse — la liste reste vide
      setMentorResults([])
    }
  }

  const handleSubmit = () => {
    const errors: { title?: string; description?: string; targetMentor?: string } = {}
    if (!data.title.trim()) errors.title = 'Le titre est requis.'
    else if (data.title.length > 255) errors.title = 'Le titre ne peut pas dépasser 255 caractères.'
    if (!data.description.trim()) errors.description = 'La description est requise.'
    if (!data.isPublic && !data.targetMentorId) {
      errors.targetMentor = 'Veuillez sélectionner un mentor pour une demande ciblée.'
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors)
      return
    }
    setLocalErrors({})
    onSubmit()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Récapitulatif de votre demande</h2>
        <p className="text-muted-foreground text-sm">Dernière étape — donnez un titre et un résumé clair.</p>
      </div>

      {/* Titre */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Titre <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Ex: Impossible d'importer un module TypeScript..."
          maxLength={255}
          className={`w-full rounded-md border bg-background px-3 py-2 ${localErrors.title ? 'border-destructive' : 'border-border'}`}
          aria-describedby={localErrors.title ? 'title-error' : undefined}
        />
        {localErrors.title && (
          <p id="title-error" role="alert" className="text-destructive text-sm flex items-center gap-1 mt-1">
            <span aria-hidden="true">⚠️</span> {localErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="description"
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Résumez votre problème en quelques phrases..."
          rows={3}
          className={`w-full rounded-md border bg-background px-3 py-2 resize-none ${localErrors.description ? 'border-destructive' : 'border-border'}`}
          aria-describedby={localErrors.description ? 'description-error' : undefined}
        />
        {localErrors.description && (
          <p id="description-error" role="alert" className="text-destructive text-sm flex items-center gap-1 mt-1">
            <span aria-hidden="true">⚠️</span> {localErrors.description}
          </p>
        )}
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-1">Type de session</label>
        <select
          id="type"
          value={data.type}
          onChange={e => onChange({ type: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Visibilité — AC 1 */}
      <div>
        <label className="block text-sm font-medium mb-2">Visibilité</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ isPublic: true, targetMentorId: undefined })}
            className={`flex-1 p-3 rounded-lg border text-sm text-left transition-colors ${
              data.isPublic ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <strong>🌍 Publique</strong>
            <p className="text-muted-foreground text-xs mt-0.5">Visible par tous les mentors disponibles</p>
          </button>
          <button
            type="button"
            onClick={() => onChange({ isPublic: false })}
            className={`flex-1 p-3 rounded-lg border text-sm text-left transition-colors ${
              !data.isPublic ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <strong>🎯 Ciblée</strong>
            <p className="text-muted-foreground text-xs mt-0.5">Vers un mentor spécifique</p>
          </button>
        </div>

        {/* Recherche mentor si mode ciblé — AC 2 */}
        {!data.isPublic && (
          <div className="mt-3 relative">
            <input
              type="text"
              value={mentorSearch}
              onChange={e => searchMentors(e.target.value)}
              placeholder="Rechercher un mentor par nom..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              aria-label="Rechercher un mentor"
            />
            {mentorResults.length > 0 && (
              <div className="absolute z-10 w-full bg-background border border-border rounded-lg mt-1 shadow-lg">
                {mentorResults.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange({ targetMentorId: m.mentorId })
                      setMentorSearch(m.username)
                      setMentorResults([])
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{m.username}</span>
                    {m.specialties.length > 0 && (
                      <span className="text-muted-foreground ml-2 text-xs">{m.specialties.join(', ')}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {data.targetMentorId && mentorResults.length === 0 && mentorSearch && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Mentor sélectionné</p>
            )}
            {localErrors.targetMentor && (
              <p role="alert" className="text-destructive text-sm flex items-center gap-1 mt-1">
                <span aria-hidden="true">⚠️</span> {localErrors.targetMentor}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Erreur API */}
      {error && (
        <p role="alert" className="text-destructive text-sm flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={submitting}
          className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          ← Précédent
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
        </button>
      </div>
    </div>
  )
}
