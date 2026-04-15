'use client'

import { useState } from 'react'

const DURATION_OPTIONS = [
  { label: 'Moins d\'1 heure', value: '< 1h' },
  { label: '1 à 4 heures', value: '1-4h' },
  { label: 'Environ 1 jour', value: '1 jour' },
  { label: 'Plus d\'1 jour', value: '> 1 jour' },
]

interface Props {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onPrev: () => void
}

export default function StepBlockedSince({ value, onChange, onNext, onPrev }: Props) {
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (!value.trim()) {
      setError('Veuillez indiquer depuis combien de temps vous êtes bloqué.')
      return
    }
    setError(null)
    onNext()
  }

  const isPreset = DURATION_OPTIONS.some(o => o.value === value)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Depuis combien de temps êtes-vous bloqué ?</h2>
        <p className="text-muted-foreground text-sm">Sélectionnez une durée ou précisez.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DURATION_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
              value === o.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {value === o.value ? '✓ ' : ''}{o.label}
          </button>
        ))}
      </div>

      {!isPreset && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Précisez si besoin (ex: 3 jours)..."
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          aria-label="Durée de blocage personnalisée"
        />
      )}
      {isPreset && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs text-muted-foreground underline"
        >
          Préciser autrement
        </button>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm flex items-center gap-2">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="flex-1 border border-border rounded-md py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Précédent
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 font-medium"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
