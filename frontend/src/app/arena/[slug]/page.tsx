'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Play, Send, CheckCircle2, XCircle, Trophy, Clock, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getChallenge, runCode, submitCode, type RunResult, type SubmitResult } from '@/services/arenaService'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const CodeEditor = dynamic(() => import('@/components/arena/CodeEditor'), { ssr: false })

/* ── Snippets de départ par langage ── */
const DEFAULT_CODE: Record<string, string> = {
  php: `<?php\n\n// Écris ton code ici\n`,
  javascript: `// Écris ton code ici\n`,
}

/* ── Couleurs de difficulté ── */
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-emerald-500 bg-emerald-500/10',
  medium: 'text-amber-500 bg-amber-500/10',
  hard: 'text-rose-500 bg-rose-500/10',
}
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }

/* ── Panneau de résultats ── */
function OutputPanel({ runResult, submitResult }: { runResult: RunResult | null; submitResult: SubmitResult | null }) {
  if (!runResult && !submitResult) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Lance le code ou soumets ta solution pour voir les résultats.
      </div>
    )
  }

  if (submitResult) {
    const passed = submitResult.status === 'passed'
    return (
      <div className="p-4 space-y-3 overflow-auto h-full">
        {/* Statut global */}
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 font-medium',
          passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
        )}>
          {passed
            ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            : <XCircle className="h-5 w-5 flex-shrink-0" />}
          <span>{passed ? 'Tous les tests passés !' : 'Des tests ont échoué.'}</span>
          <span className="ml-auto font-bold">
            {submitResult.testsPassed}/{submitResult.testsTotal} tests · {submitResult.score} pts
          </span>
        </div>

        {/* Badges obtenus */}
        {submitResult.badgesAwarded.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-medium">Badge{submitResult.badgesAwarded.length > 1 ? 's' : ''} obtenu{submitResult.badgesAwarded.length > 1 ? 's' : ''} :</span>
            <span className="text-primary">{submitResult.badgesAwarded.join(', ')}</span>
          </div>
        )}
      </div>
    )
  }

  if (runResult) {
    return (
      <div className="p-4 space-y-3 overflow-auto h-full font-mono text-sm">
        {runResult.timedOut && (
          <div className="flex items-center gap-2 text-amber-500 text-xs">
            <Clock className="h-4 w-4" /> Délai d&apos;exécution dépassé (3 s)
          </div>
        )}
        {runResult.stdout && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-sans">stdout</p>
            <pre className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap break-all text-foreground">{runResult.stdout}</pre>
          </div>
        )}
        {runResult.stderr && (
          <div>
            <p className="text-xs text-rose-500 mb-1 font-sans">stderr</p>
            <pre className="bg-rose-500/10 rounded-lg p-3 whitespace-pre-wrap break-all text-rose-400">{runResult.stderr}</pre>
          </div>
        )}
        {!runResult.stdout && !runResult.stderr && (
          <p className="text-muted-foreground text-xs font-sans">Aucune sortie.</p>
        )}
        <p className="text-xs text-muted-foreground font-sans">Exit code : {runResult.exitCode}</p>
      </div>
    )
  }

  return null
}

/* ── Page principale ── */
export default function ArenaIDEPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const { data: challenge, isLoading, error } = useQuery({
    queryKey: ['arena-challenge', slug],
    queryFn: () => getChallenge(slug),
  })

  const [language, setLanguage] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  // Initialise le langage et le code une seule fois au chargement du défi
  const initDone = !!language
  if (challenge && !initDone) {
    const defaultLang = challenge.languages[0] ?? 'javascript'
    setLanguage(defaultLang)
    setCode(DEFAULT_CODE[defaultLang] ?? '')
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] ?? '')
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
  }

  async function handleRun() {
    if (!language || !code.trim()) return
    setIsRunning(true)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    try {
      const result = await runCode(language, code)
      setRunResult(result)
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsRunning(false)
    }
  }

  async function handleSubmit() {
    if (!language || !code.trim() || !challenge) return
    setIsSubmitting(true)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    try {
      const result = await submitCode(challenge.slug, language, code)
      setSubmitResult(result)
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── États de chargement / erreur ── */
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Chargement du défi…</div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Défi introuvable ou service indisponible.</p>
          <Link href="/arena" className="text-sm text-primary hover:underline">← Retour aux défis</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">

      {/* ── Barre du haut ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-background/80 backdrop-blur-md flex-shrink-0">
        <Link href="/arena" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Arena
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium truncate">{challenge.title}</span>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ml-1', DIFFICULTY_COLOR[challenge.difficulty])}>
          {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Sélecteur de langage */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {challenge.languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          {/* Exécuter */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Exécution…' : 'Exécuter'}
          </Button>

          {/* Soumettre */}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? 'Envoi…' : 'Soumettre'}
          </Button>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panneau gauche : énoncé ── */}
        <aside className="w-[380px] flex-shrink-0 border-r border-border/60 overflow-y-auto p-5 space-y-5">
          <div>
            <h2 className="font-semibold mb-3">{challenge.title}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
              {challenge.statement}
            </div>
          </div>

          {/* Tests publics (exemples) */}
          {challenge.publicTests.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemples</p>
              {challenge.publicTests.map((test, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs font-mono">
                  {test.stdin && (
                    <div>
                      <p className="text-muted-foreground font-sans mb-1">Entrée</p>
                      <pre className="bg-background rounded-lg p-2 text-foreground whitespace-pre-wrap">{test.stdin}</pre>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground font-sans mb-1">Sortie attendue</p>
                    <pre className="bg-background rounded-lg p-2 text-foreground whitespace-pre-wrap">{test.expectedOutput}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Panneau droit : éditeur + sortie ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Éditeur (70%) */}
          <div className="flex-[7] min-h-0 border-b border-border/60">
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
            />
          </div>

          {/* Sortie (30%) */}
          <div className="flex-[3] min-h-0 overflow-hidden">
            <div className="flex items-center px-4 py-2 border-b border-border/40 bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sortie</span>
            </div>
            <div className="h-[calc(100%-36px)]">
              {runtimeError
                ? (
                  <div className="p-4 flex items-start gap-2 text-rose-500 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {runtimeError}
                  </div>
                )
                : <OutputPanel runResult={runResult} submitResult={submitResult} />
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
