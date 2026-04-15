'use client'

import { useState } from 'react'
import type { MentoringRequestType } from '@/types/mentoring'

const TYPE_OPTIONS: { value: MentoringRequestType; label: string }[] = [
  { value: 'debug', label: 'Débogage' },
  { value: 'one_to_one', label: 'One-to-one' },
  { value: 'exercise', label: 'Exercice' },
  { value: 'code_review', label: 'Code review' },
]

interface SummaryData {
  title: string
  description: string
  type: string
  isPublic: boolean
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
  const [localErrors, setLocalErrors] = useState<{ title?: string; description?: string }>({})

  const handleSubmit = () => {
    const errors: { title?: string; description?: string } = {}
    if (!data.title.trim()) errors.title = 'Le titre est requis.'
    else if (data.title.length > 255) errors.title = 'Le titre ne peut pas dépasser 255 caractères.'
    if (!data.description.trim()) errors.description = 'La description est requise.'

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
          rows={4}
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

      {/* Visibilité */}
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Demande publique</p>
          <p className="text-xs text-muted-foreground">Visible par tous les mentors disponibles</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.isPublic}
          onClick={() => onChange({ isPublic: !data.isPublic })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.isPublic ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.isPublic ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Erreur globale (retour API) */}
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
          {submitting ? 'Envoi...' : 'Soumettre la demande'}
        </button>
      </div>
    </div>
  )
}
