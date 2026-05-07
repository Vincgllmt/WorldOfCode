'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Code2 } from 'lucide-react'

const LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'php', label: 'PHP' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'other', label: 'Autre' },
]

interface Props {
  expected: string
  observed: string
  codeSnippet: string
  codeLanguage: string
  onChangeExpected: (v: string) => void
  onChangeObserved: (v: string) => void
  onChangeCodeSnippet: (v: string) => void
  onChangeCodeLanguage: (v: string) => void
  onNext: () => void
  onPrev: () => void
}

export default function StepBehavior({
  expected, observed, codeSnippet, codeLanguage,
  onChangeExpected, onChangeObserved, onChangeCodeSnippet, onChangeCodeLanguage,
  onNext, onPrev,
}: Props) {
  const [showCode, setShowCode] = useState(!!codeSnippet)
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (!expected.trim() || !observed.trim()) {
      setError('Veuillez renseigner les deux champs.')
      return
    }
    setError(null)
    onNext()
  }

  const handleToggleCode = () => {
    if (showCode && codeSnippet) {
      onChangeCodeSnippet('')
    }
    setShowCode(v => !v)
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

      {/* Section code optionnelle */}
      <div className="rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={handleToggleCode}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            Partager un extrait de code
            <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
          </span>
          {showCode ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showCode && (
          <div className="border-t border-border">
            {/* Sélecteur de langage */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border">
              <label htmlFor="code-lang" className="text-xs text-muted-foreground shrink-0">Langage :</label>
              <select
                id="code-lang"
                value={codeLanguage}
                onChange={e => onChangeCodeLanguage(e.target.value)}
                className="text-xs bg-transparent border-none outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            {/* Éditeur monospace */}
            <textarea
              value={codeSnippet}
              onChange={e => onChangeCodeSnippet(e.target.value)}
              placeholder={`// Collez votre code ici...`}
              rows={8}
              spellCheck={false}
              className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm px-4 py-3 resize-y outline-none"
              aria-label="Extrait de code"
            />
          </div>
        )}
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
