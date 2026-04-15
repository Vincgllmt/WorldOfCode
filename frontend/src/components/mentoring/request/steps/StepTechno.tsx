'use client'

import { useState } from 'react'

const COMMON_TECHS = ['React', 'Node.js', 'Python', 'TypeScript', 'PHP', 'Java', 'Docker', 'SQL']

interface Props {
  value: string
  onChange: (v: string) => void
  onNext: () => void
}

export default function StepTechno({ value, onChange, onNext }: Props) {
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (!value.trim()) {
      setError('Veuillez sélectionner ou saisir une technologie.')
      return
    }
    setError(null)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Sur quelle technologie portait votre problème ?</h2>
        <p className="text-muted-foreground text-sm">Sélectionnez ou tapez directement.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {COMMON_TECHS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              value === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {value === t ? '✓ ' : ''}{t}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Autre technologie..."
        className="w-full rounded-md border border-border bg-background px-3 py-2"
        aria-label="Autre technologie"
      />

      {error && (
        <p role="alert" className="text-destructive text-sm flex items-center gap-2">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleNext}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium"
      >
        Suivant →
      </button>
    </div>
  )
}
