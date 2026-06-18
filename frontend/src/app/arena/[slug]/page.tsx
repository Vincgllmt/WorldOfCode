'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Play, Send, CheckCircle2, XCircle, Trophy, Clock, AlertTriangle, Loader2, ListChecks } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getChallenge, playGame, runCode, runTests, submitCode, type PlayResult, type RunResult, type SubmitResult, type TestRunResult } from '@/services/arenaService'
import type { Replay } from '@/components/arena/gameViewer'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ChallengeStatement from '@/components/arena/ChallengeStatement'
import BadgeUnlockOverlay from '@/components/arena/BadgeUnlockOverlay'
import type { ArenaBadge, ArenaChallengeDetail } from '@/interfaces/arena'
import { GAMES } from '../games/registry'

const CodeEditor = dynamic(() => import('@/components/arena/CodeEditor'), { ssr: false })
const ReplayPlayer = dynamic(() => import('@/components/arena/ReplayPlayer'), { ssr: false })

/* ── Snippets de départ par langage ── */
const DEFAULT_CODE: Record<string, string> = {
  php: `<?php\n\n// Écris ton code ici\n`,
  javascript: `// Écris ton code ici\n`,
  typescript: `// Écris ton code ici\n`,
  python: `# Écris ton code ici\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Écris ton code ici\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Écris ton code ici\n    return 0;\n}\n`,
}

/* ── Persistance locale du code (par défi + langage) ── */
/* Le code écrit est conservé dans localStorage pour être retrouvé au rechargement
   ou à une visite ultérieure ; une clé par langage afin de ne rien écraser en changeant. */
const codeStorageKey = (slug: string, lang: string) => `arena:code:${slug}:${lang}`

function loadSavedCode(slug: string, lang: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeStorageKey(slug, lang))
  } catch {
    return null
  }
}

function saveCode(slug: string, lang: string, code: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(codeStorageKey(slug, lang), code)
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }
const DIFF_PILL: Record<string, string> = {
  easy: 'bg-[#E3F6EA] text-[#0B8F45]',
  medium: 'bg-[#FCEFDD] text-[#C76A10]',
  hard: 'bg-[#FBE4E4] text-[#D02B2B]',
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* Libellés lisibles pour les codes de badge connus (repli sur le code brut). */
const BADGE_LABELS: Record<string, string> = {
  perfect: 'Sans faute',
  first_solve: 'Première résolution',
}
const badgeLabel = (code: string) => BADGE_LABELS[code] ?? code

/* Célébration de réussite : badge à montrer + s'il s'agit d'un badge réellement gagné. */
type Celebration = { badge: ArenaBadge; unlocked: boolean }

/* Construit le badge à célébrer dans l'overlay de réussite (médaille du jeu). */
function buildGameBadge(challenge: ArenaChallengeDetail, awarded: string[]): ArenaBadge {
  return {
    badgeId: 0,
    name: awarded.map(badgeLabel).join(' · ') || challenge.title,
    description: null,
    icon: null,
    challengeSlug: challenge.slug,
    awardedAt: new Date().toISOString(),
  }
}

/* Libellé + couleur d'un verdict d'essai (cas de test). */
const VERDICT_META: Record<TestRunResult['verdict'], { label: string; color: string }> = {
  passed: { label: 'Réussi', color: 'text-emerald-600' },
  failed: { label: 'Échoué', color: 'text-rose-500' },
  error: { label: 'Erreur', color: 'text-amber-500' },
}

/* Pastille d'état d'un cas : neutre tant qu'il n'a pas été essayé. */
function TestStatusDot({ run }: { run?: TestRunResult }) {
  if (!run) return <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
  if (run.verdict === 'passed') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
  if (run.verdict === 'failed') return <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
  return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
}

/* ── Panneau de résultats ── */
function OutputPanel({ runResult, submitResult }: { runResult: RunResult | null; submitResult: SubmitResult | null }) {
  if (!runResult && !submitResult) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Lance le code ou soumets ta solution pour voir les résultats.
      </div>
    )
  }

  if (submitResult) {
    const passed = submitResult.status === 'passed'
    return (
      <div className="h-full space-y-3 overflow-auto p-4">
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 font-medium',
          passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500',
        )}>
          {passed ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          <span>{passed ? 'Tous les tests passés !' : 'Des tests ont échoué.'}</span>
          <span className="ml-auto font-bold">
            {submitResult.testsPassed}/{submitResult.testsTotal} tests · {submitResult.score} pts
          </span>
        </div>
        {submitResult.badgesAwarded.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Trophy className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium">Badge{submitResult.badgesAwarded.length > 1 ? 's' : ''} :</span>
            {submitResult.badgesAwarded.map((code) => (
              <span
                key={code}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
              >
                {badgeLabel(code)}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (runResult) {
    return (
      <div className="h-full space-y-3 overflow-auto p-4 font-mono text-sm">
        {runResult.timedOut && (
          <div className="flex items-center gap-2 text-amber-500 text-xs">
            <Clock className="h-4 w-4" /> Délai d&apos;exécution dépassé (3 s)
          </div>
        )}
        {runResult.stdout && (
          <div>
            <p className="mb-1 font-sans text-xs text-muted-foreground">stdout</p>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-foreground">{runResult.stdout}</pre>
          </div>
        )}
        {runResult.stderr && (
          <div>
            <p className="mb-1 font-sans text-xs text-rose-500">stderr</p>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-rose-500/10 p-3 text-rose-500">{runResult.stderr}</pre>
          </div>
        )}
        {!runResult.stdout && !runResult.stderr && (
          <p className="font-sans text-xs text-muted-foreground">Aucune sortie.</p>
        )}
        <p className="font-sans text-xs text-muted-foreground">Exit code : {runResult.exitCode}</p>
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
  const [playResult, setPlayResult] = useState<PlayResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [leftTab, setLeftTab] = useState<'sujet' | 'tests'>('sujet')

  // Célébration plein écran quand tous les tests passent (null = overlay fermé).
  // `unlocked` distingue un badge réellement gagné d'une simple réussite d'essai.
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  // Célébration en attente : déclenchée seulement à la fin de la visualisation de tous les cas.
  const [pendingCelebration, setPendingCelebration] = useState<Celebration | null>(null)

  // Jeu de tests (mode jeu) : cas sélectionné, résultats par cas, état d'exécution.
  const [selectedTest, setSelectedTest] = useState(0)
  const [testRuns, setTestRuns] = useState<Record<number, TestRunResult>>({})
  const [runningTest, setRunningTest] = useState<number | 'all' | null>(null)
  const [runSummary, setRunSummary] = useState<{ passed: number; total: number } | null>(null)

  // File de replays jouée séquentiellement dans la visualisation (un cas après l'autre).
  const [replayQueue, setReplayQueue] = useState<{ index: number; replay: Replay }[]>([])
  const [queuePos, setQueuePos] = useState(0)
  const [runKey, setRunKey] = useState(0)

  // Tailles des panneaux redimensionnables (px)
  const [leftWidth, setLeftWidth] = useState(480)
  const [vizHeight, setVizHeight] = useState(240)
  const [sortieHeight, setSortieHeight] = useState(240)

  const game = GAMES[slug]
  const isGame = !!game
  const gameTests = isGame && challenge ? challenge.publicTests : []
  const busy = isRunning || isSubmitting || isPlaying || runningTest !== null

  // État de départ du cas sélectionné (replay figé d'1 frame) : affiché tant qu'aucun
  // replay de run/partie n'est en cours, et au chargement de la page (cas 1).
  const previewReplay = useMemo<Replay | null>(() => {
    const test = gameTests[selectedTest]
    if (!game || !test) return null
    return game.buildPreview(test.stdin ?? '')
  }, [game, gameTests, selectedTest])

  // Cas en cours de lecture dans la file de replays (null si aucune lecture en cours).
  const currentReplay = replayQueue[queuePos] ?? null
  const currentRun = currentReplay ? testRuns[currentReplay.index] : undefined

  // Initialise langage + code au chargement (code restauré depuis localStorage si présent)
  if (challenge && !language) {
    const defaultLang = challenge.languages[0] ?? 'javascript'
    setLanguage(defaultLang)
    setCode(loadSavedCode(slug, defaultLang) ?? DEFAULT_CODE[defaultLang] ?? '')
  }

  // Persiste le code à chaque modification pour le retrouver au rechargement / plus tard.
  useEffect(() => {
    if (!language) return
    saveCode(slug, language, code)
  }, [slug, language, code])

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    setCode(loadSavedCode(slug, lang) ?? DEFAULT_CODE[lang] ?? '')
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    // Le code change : les essais précédents ne sont plus valides → on revient à l'aperçu.
    clearReplays()
    setPlayResult(null)
    setTestRuns({})
    setRunSummary(null)
  }

  /* Vide la file de replays → la visualisation revient à l'aperçu du cas sélectionné. */
  function clearReplays() {
    setReplayQueue([])
    setQueuePos(0)
    setPendingCelebration(null)
  }

  /* Démarre la lecture séquentielle des replays d'une série de cas. */
  function startReplayQueue(results: TestRunResult[]) {
    const queue = results.flatMap((r) => (r.replay ? [{ index: r.index, replay: r.replay }] : []))
    setReplayQueue(queue)
    setQueuePos(0)
    setRunKey((k) => k + 1)
    if (queue.length > 0) setSelectedTest(queue[0].index)
  }

  /* Passe au replay suivant de la file (appelé à la fin de chaque cas). */
  function advanceReplay() {
    // Le cas qui vient de se terminer a échoué → on stoppe la lecture :
    // pas d'enchaînement des cas suivants, et aucune animation déclenchée.
    const finished = replayQueue[queuePos]
    if (finished && testRuns[finished.index]?.verdict !== 'passed') {
      setPendingCelebration(null)
      return
    }
    // Il reste des cas à jouer → on enchaîne.
    if (queuePos < replayQueue.length - 1) {
      const next = queuePos + 1
      setSelectedTest(replayQueue[next].index)
      setQueuePos(next)
      return
    }
    // Dernier cas joué et tous réussis → on déclenche enfin l'animation différée.
    if (pendingCelebration) {
      setCelebration(pendingCelebration)
      setPendingCelebration(null)
    }
  }

  /* Sélectionne un cas de test → la visualisation montre son état de départ. */
  function handleSelectTest(i: number) {
    setSelectedTest(i)
    clearReplays()
    setPlayResult(null)
    setRunSummary(null)
    setRuntimeError(null)
  }

  /* Essai NON noté sur un seul cas. */
  async function handleRunTest(i: number) {
    if (!language || !code.trim() || !challenge) return
    setRunningTest(i)
    setSelectedTest(i)
    setPlayResult(null)
    setRunSummary(null)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    try {
      const [res] = await runTests(challenge.slug, language, code, i)
      if (res) {
        setTestRuns((prev) => ({ ...prev, [i]: res }))
        if (res.error) setRuntimeError(res.error)
        startReplayQueue([res])
      }
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setRunningTest(null)
    }
  }

  /* Essai NON noté sur tous les cas en un clic : on rejoue chaque cas l'un après l'autre. */
  async function handleRunAllTests() {
    if (!language || !code.trim() || !challenge) return
    setRunningTest('all')
    setPlayResult(null)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    setCelebration(null)
    setPendingCelebration(null)
    try {
      const results = await runTests(challenge.slug, language, code)
      const byIndex: Record<number, TestRunResult> = {}
      for (const r of results) byIndex[r.index] = r
      setTestRuns(byIndex)
      setRunSummary({ passed: results.filter((r) => r.verdict === 'passed').length, total: results.length })
      const firstError = results.find((r) => r.error)?.error
      if (firstError) setRuntimeError(firstError)
      startReplayQueue(results)
      // Essai non noté : célébration sans badge si tous les cas passent, déclenchée
      // seulement à la fin de la visualisation (la lecture s'arrête au 1er échec).
      if (results.length > 0 && results.every((r) => r.verdict === 'passed')) {
        const celeb: Celebration = { badge: buildGameBadge(challenge, []), unlocked: false }
        if (results.some((r) => r.replay)) setPendingCelebration(celeb)
        else setCelebration(celeb)
      }
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setRunningTest(null)
    }
  }

  async function handleRun() {
    if (!language || !code.trim()) return
    setIsRunning(true)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    try {
      setRunResult(await runCode(language, code))
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsRunning(false)
    }
  }

  async function handlePlay() {
    if (!language || !code.trim() || !challenge) return
    setIsPlaying(true)
    setRunResult(null)
    setSubmitResult(null)
    setRuntimeError(null)
    setRunSummary(null)
    setCelebration(null)
    setPendingCelebration(null)
    try {
      const result = await playGame(challenge.slug, language, code)
      setPlayResult(result)
      const byIndex: Record<number, TestRunResult> = {}
      for (const r of result.results) byIndex[r.index] = r
      setTestRuns(byIndex)
      const firstError = result.results.find((r) => r.error)?.error
      if (firstError) setRuntimeError(firstError)
      // Rejoue chaque cas l'un après l'autre dans la visualisation.
      startReplayQueue(result.results)
      if (result.verdict === 'passed') {
        const celeb: Celebration = { badge: buildGameBadge(challenge, result.badgesAwarded), unlocked: result.badgesAwarded.length > 0 }
        // Animation différée jusqu'à la fin des replays ; immédiate s'il n'y en a aucun.
        if (result.results.some((r) => r.replay)) setPendingCelebration(celeb)
        else setCelebration(celeb)
      }
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsPlaying(false)
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
      if (result.status === 'passed')
        setCelebration({ badge: buildGameBadge(challenge, result.badgesAwarded), unlocked: result.badgesAwarded.length > 0 })
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Poignées de redimensionnement ── */
  function startColResize(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftWidth
    const move = (ev: MouseEvent) => setLeftWidth(clamp(startW + (ev.clientX - startX), 320, 860))
    const stop = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  function startRowResize(e: React.MouseEvent, kind: 'viz' | 'sortie') {
    e.preventDefault()
    const startY = e.clientY
    const startH = kind === 'viz' ? vizHeight : sortieHeight
    const move = (ev: MouseEvent) => {
      const next = startH - (ev.clientY - startY)
      if (kind === 'viz') setVizHeight(clamp(next, 120, 560))
      else setSortieHeight(clamp(next, 120, 620))
    }
    const stop = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
  }

  /* ── États de chargement / erreur ── */
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Chargement du défi…</div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <p className="text-sm text-muted-foreground">Défi introuvable ou service indisponible.</p>
          <Link href="/arena" className="text-sm text-primary hover:underline">← Retour aux défis</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-6 py-3">
        <Link href="/arena" className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Arena
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate text-sm font-semibold">{challenge.title}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold', DIFF_PILL[challenge.difficulty])}>
          {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {challenge.languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={busy}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Exécution…' : 'Exécuter'}
          </Button>

          <Button
            size="sm"
            onClick={isGame ? handlePlay : handleSubmit}
            disabled={busy}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isGame ? (isPlaying ? 'Lancement…' : 'Jouer') : (isSubmitting ? 'Envoi…' : 'Soumettre')}
          </Button>
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Colonne gauche (redimensionnable) ── */}
        <div style={{ width: leftWidth }} className="flex min-h-0 shrink-0 flex-col border-r border-border bg-background">
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as 'sujet' | 'tests')} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="flex shrink-0 gap-1 rounded-none border-b border-border bg-transparent px-4 pt-2">
              <TabsTrigger value="sujet" className="min-w-0">Sujet</TabsTrigger>
              <TabsTrigger value="tests" className="min-w-0 gap-1.5">
                Tests
                <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {challenge.publicTests.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="sujet">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11.5px] font-bold', DIFF_PILL[challenge.difficulty])}>
                    {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    +{challenge.maxScore} pts
                  </span>
                </div>
                <h2 className="mt-3 text-[22px] font-extrabold leading-tight tracking-tight">{challenge.title}</h2>
                <div className="mt-4 rounded-2xl border border-border bg-muted p-5">
                  <ChallengeStatement statement={challenge.statement} />
                </div>
              </TabsContent>

              <TabsContent value="tests">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold">Jeu de tests</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {isGame ? `${gameTests.length} cas` : `${challenge.publicTests.length} cas public(s)`}
                    </p>
                  </div>
                  {isGame && gameTests.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRunAllTests}
                      disabled={busy || !code.trim()}
                      className="gap-1.5"
                    >
                      {runningTest === 'all'
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ListChecks className="h-3.5 w-3.5" />}
                      Tout lancer
                    </Button>
                  )}
                </div>

                {isGame ? (
                  gameTests.length > 0 ? (
                    <>
                      {runSummary && (
                        <div className={cn(
                          'mt-3 rounded-xl px-3 py-2 text-xs font-semibold',
                          runSummary.passed === runSummary.total ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500',
                        )}>
                          Essai · {runSummary.passed}/{runSummary.total} cas réussis
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        {gameTests.map((_, i) => {
                          const run = testRuns[i]
                          const isSel = selectedTest === i
                          return (
                            <div
                              key={i}
                              className={cn(
                                'flex items-center gap-2 rounded-xl border p-2.5 transition',
                                isSel ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40',
                              )}
                            >
                              <button
                                onClick={() => handleSelectTest(i)}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                title="Voir l'état de départ"
                              >
                                <TestStatusDot run={run} />
                                <span className="text-sm font-semibold">Cas {i + 1}</span>
                                {run && (
                                  <span className={cn('text-xs font-medium', VERDICT_META[run.verdict].color)}>
                                    {VERDICT_META[run.verdict].label}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => handleRunTest(i)}
                                disabled={busy || !code.trim()}
                                title="Lancer ce cas"
                                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {runningTest === i
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Play className="h-4 w-4" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        Clique un cas pour voir son état de départ, ▶ pour l&apos;essayer (non noté),
                        ou « Jouer » pour la soumission notée sur tous les cas.
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Aucun cas de test pour ce jeu.</p>
                  )
                ) : challenge.publicTests.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {challenge.publicTests.map((test, i) => (
                      <div key={i} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-border" />
                          <span className="text-sm font-bold">Cas {i + 1}</span>
                          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Public</span>
                        </div>
                        {test.stdin && (
                          <div className="font-mono text-xs">
                            <p className="mb-1 text-muted-foreground">IN</p>
                            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-foreground">{test.stdin}</pre>
                          </div>
                        )}
                        <div className="font-mono text-xs">
                          <p className="mb-1 text-muted-foreground">OUT</p>
                          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-foreground">{test.expectedOutput}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Aucun test public — l&apos;input est fourni à ton programme au lancement.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Poignée + Visualisation (jeux uniquement) */}
          {game && (
            <>
              <div
                onMouseDown={(e) => startRowResize(e, 'viz')}
                className="flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-y border-border bg-muted transition hover:bg-accent"
              >
                <span className="h-[3px] w-11 rounded-full bg-border" />
              </div>
              <div style={{ height: vizHeight }} className="flex shrink-0 flex-col bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">Visualisation</span>
                  <div className="flex items-center gap-2">
                    {currentReplay && (
                      <span className={cn(
                        'text-xs font-semibold',
                        currentRun ? VERDICT_META[currentRun.verdict].color : 'text-muted-foreground',
                      )}>
                        Cas {currentReplay.index + 1}{currentRun ? ` · ${VERDICT_META[currentRun.verdict].label}` : ''}
                        {replayQueue.length > 1 ? ` · ${queuePos + 1}/${replayQueue.length}` : ''}
                      </span>
                    )}
                    {playResult ? (
                      <span className={cn(
                        'text-xs font-semibold',
                        playResult.verdict === 'passed' ? 'text-emerald-600' : playResult.verdict === 'failed' ? 'text-rose-500' : 'text-amber-500',
                      )}>
                        {playResult.verdict === 'passed'
                          ? `✓ Réussi · ${playResult.testsPassed}/${playResult.testsTotal} · ${playResult.score} pts`
                          : playResult.verdict === 'failed' ? `✗ ${playResult.testsPassed}/${playResult.testsTotal} cas` : '⚠ Erreur'}
                      </span>
                    ) : !currentReplay && previewReplay ? (
                      <span className="text-xs font-medium text-muted-foreground">Cas {selectedTest + 1} · état de départ</span>
                    ) : null}
                  </div>
                </div>
                {playResult && playResult.badgesAwarded.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {playResult.badgesAwarded.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                      >
                        {badgeLabel(code)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  {currentReplay ? (
                    <ReplayPlayer
                      key={`run-${runKey}-${queuePos}`}
                      replay={currentReplay.replay}
                      viewerFactory={game.createViewer}
                      onEnded={advanceReplay}
                    />
                  ) : previewReplay ? (
                    <ReplayPlayer key={`preview-${selectedTest}`} replay={previewReplay} viewerFactory={game.createViewer} autoPlay={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                      Sélectionne un cas de test pour voir son état de départ.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Poignée verticale ── */}
        <div
          onMouseDown={startColResize}
          className="flex w-2.5 shrink-0 cursor-col-resize items-center justify-center bg-muted transition hover:bg-accent"
        >
          <span className="h-11 w-[3px] rounded-full bg-border" />
        </div>

        {/* ── Colonne droite : éditeur + sortie ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditor language={language} value={code} onChange={setCode} />
          </div>

          <div
            onMouseDown={(e) => startRowResize(e, 'sortie')}
            className="flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-y border-border bg-muted transition hover:bg-accent"
          >
            <span className="h-[3px] w-11 rounded-full bg-border" />
          </div>

          <div style={{ height: sortieHeight }} className="flex shrink-0 flex-col bg-card">
            <div className="flex items-center gap-4 border-b border-border px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-[.08em] text-foreground">Sortie</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {runtimeError ? (
                <div className="flex items-start gap-2 p-4 text-sm text-rose-500">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {runtimeError}
                </div>
              ) : (
                <OutputPanel runResult={runResult} submitResult={submitResult} />
              )}
            </div>
          </div>
        </div>
      </div>

      <BadgeUnlockOverlay
        badge={celebration?.badge ?? null}
        unlocked={celebration?.unlocked ?? false}
        onClose={() => setCelebration(null)}
      />
    </div>
  )
}
