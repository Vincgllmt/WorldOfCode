'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onPrev: () => void
}

export default function StepAlreadyTried({ value, onChange, onNext, onPrev }: Props) {
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (!value.trim()) {
      setError('Veuillez décrire ce que vous avez déjà essayé.')
      return
    }
    setError(null)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Qu&apos;avez-vous déjà essayé ?</h2>
        <p className="text-muted-foreground text-sm">
          Documentation, Stack Overflow, collègues... Soyez précis pour gagner du temps.
        </p>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="J'ai essayé de lire la documentation, cherché sur Stack Overflow, relu mon code..."
        rows={5}
        className="w-full rounded-md border border-border bg-background px-3 py-2 resize-none"
        aria-label="Ce que vous avez déjà essayé"
      />

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
