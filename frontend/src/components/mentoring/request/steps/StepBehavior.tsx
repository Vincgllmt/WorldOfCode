'use client'

import { useState } from 'react'

interface Props {
  expected: string
  observed: string
  onChangeExpected: (v: string) => void
  onChangeObserved: (v: string) => void
  onNext: () => void
  onPrev: () => void
}

export default function StepBehavior({
  expected, observed,
  onChangeExpected, onChangeObserved,
  onNext, onPrev,
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (!expected.trim() || !observed.trim()) {
      setError('Veuillez renseigner les deux champs.')
      return
    }
    setError(null)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Comportement attendu vs observé</h2>
        <p className="text-muted-foreground text-sm">
          Décrivez ce qui devrait se passer et ce qui se passe réellement.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="expected" className="block text-sm font-medium mb-1">
            Comportement attendu
          </label>
          <textarea
            id="expected"
            value={expected}
            onChange={e => onChangeExpected(e.target.value)}
            placeholder="Quand je fais X, je m'attends à ce que Y se produise..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 resize-none"
          />
        </div>

        <div>
          <label htmlFor="observed" className="block text-sm font-medium mb-1">
            Comportement observé
          </label>
          <textarea
            id="observed"
            value={observed}
            onChange={e => onChangeObserved(e.target.value)}
            placeholder="Ce qui se passe réellement : erreur, comportement inattendu..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 resize-none"
          />
        </div>
      </div>

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
