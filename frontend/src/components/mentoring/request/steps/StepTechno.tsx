'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const MAX = 3
const COMMON_TECHS = ['React', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'PHP', 'Java', 'Docker', 'SQL', 'GraphQL', 'Vue.js']

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  onNext: () => void
}

export default function StepTechno({ value, onChange, onNext }: Props) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)

  const toggle = (tech: string) => {
    if (value.includes(tech)) {
      onChange(value.filter(t => t !== tech))
    } else if (value.length < MAX) {
      onChange([...value, tech])
    }
  }

  const addCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) { setCustom(''); return }
    if (value.length >= MAX) return
    onChange([...value, trimmed])
    setCustom('')
  }

  const remove = (tech: string) => onChange(value.filter(t => t !== tech))

  const handleNext = () => {
    if (value.length === 0) {
      setError('Veuillez sélectionner au moins une technologie.')
      return
    }
    setError(null)
    onNext()
  }

  const atMax = value.length >= MAX

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Sur quelles technologies porte votre problème ?</h2>
        <p className="text-muted-foreground text-sm">
          Sélectionnez jusqu&apos;à {MAX} technologies.
        </p>
      </div>

      {/* Chips sélectionnées */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-primary text-primary-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                aria-label={`Retirer ${t}`}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Sélection rapide */}
      <div className="flex flex-wrap gap-2">
        {COMMON_TECHS.filter(t => !value.includes(t)).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            disabled={atMax}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              atMax
                ? 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                : 'border-border hover:border-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {atMax && (
        <p className="text-xs text-muted-foreground">Maximum {MAX} technologies atteint.</p>
      )}

      {/* Saisie libre */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Autre technologie..."
          disabled={atMax}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          aria-label="Saisir une autre technologie"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={atMax || !custom.trim()}
          className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

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
