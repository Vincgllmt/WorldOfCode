'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Play, Send, CheckCircle2, XCircle, Trophy, Clock, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getChallenge, playGame, runCode, submitCode, type PlayResult, type RunResult, type SubmitResult } from '@/services/arenaService'
import type { Replay } from '@/components/arena/gameViewer'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GAME_VIEWERS } from '../games/registry'

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

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }
const DIFF_PILL: Record<string, string> = {
  easy: 'bg-[#E3F6EA] text-[#0B8F45]',
  medium: 'bg-[#FCEFDD] text-[#C76A10]',
  hard: 'bg-[#FBE4E4] text-[#D02B2B]',
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ── Panneau de résultats ── */
function OutputPanel({ runResult, submitResult }: { runResult: RunResult | null; submitResult: SubmitResult | null }) {
  if (!runResult && !submitResult) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#9AA6A0]">
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
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-medium">Badge{submitResult.badgesAwarded.length > 1 ? 's' : ''} :</span>
            <span className="text-primary">{submitResult.badgesAwarded.join(', ')}</span>
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
            <p className="mb-1 font-sans text-xs text-[#94A099]">stdout</p>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-[#F3F7F5] p-3 text-[#15241C]">{runResult.stdout}</pre>
          </div>
        )}
        {runResult.stderr && (
          <div>
            <p className="mb-1 font-sans text-xs text-rose-500">stderr</p>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-rose-500/10 p-3 text-rose-500">{runResult.stderr}</pre>
          </div>
        )}
        {!runResult.stdout && !runResult.stderr && (
          <p className="font-sans text-xs text-[#94A099]">Aucune sortie.</p>
        )}
        <p className="font-sans text-xs text-[#94A099]">Exit code : {runResult.exitCode}</p>
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
  const [replay, setReplay] = useState<Replay | null>(null)
  const [playResult, setPlayResult] = useState<PlayResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const [leftTab, setLeftTab] = useState<'sujet' | 'tests'>('sujet')

  // Tailles des panneaux redimensionnables (px)
  const [leftWidth, setLeftWidth] = useState(480)
  const [vizHeight, setVizHeight] = useState(240)
  const [sortieHeight, setSortieHeight] = useState(240)

  const isGame = !!GAME_VIEWERS[slug]

  // Initialise langage + code au chargement
  if (challenge && !language) {
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
    try {
      const result = await playGame(challenge.slug, language, code)
      setPlayResult(result)
      if (result.replay) {
        setReplay(result.replay)
        setReplayKey((k) => k + 1)
      }
      if (result.error) setRuntimeError(result.error)
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
      setSubmitResult(await submitCode(challenge.slug, language, code))
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
    <div className="flex h-full flex-col bg-[#FBFDFC] text-[#15241C]">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#EAEFEC] bg-white px-6 py-3">
        <Link href="/arena" className="flex items-center gap-1 text-sm text-[#5C6B63] transition hover:text-[#0E9F4A]">
          <ChevronLeft className="h-4 w-4" /> Arena
        </Link>
        <span className="text-[#C0C9C3]">/</span>
        <span className="truncate text-sm font-semibold">{challenge.title}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-bold', DIFF_PILL[challenge.difficulty])}>
          {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-[#DCE4DF] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0E9F4A]"
          >
            {challenge.languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={isRunning || isSubmitting || isPlaying}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Exécution…' : 'Exécuter'}
          </Button>

          <Button
            size="sm"
            onClick={isGame ? handlePlay : handleSubmit}
            disabled={isRunning || isSubmitting || isPlaying}
            className="gap-1.5 bg-[#11A84F] text-white shadow-[0_6px_16px_-6px_rgba(17,168,79,.6)] hover:bg-[#0E9F4A]"
          >
            <Send className="h-3.5 w-3.5" />
            {isGame ? (isPlaying ? 'Lancement…' : 'Jouer') : (isSubmitting ? 'Envoi…' : 'Soumettre')}
          </Button>
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Colonne gauche (redimensionnable) ── */}
        <div style={{ width: leftWidth }} className="flex min-h-0 shrink-0 flex-col border-r border-[#EAEFEC] bg-[#FBFDFC]">
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as 'sujet' | 'tests')} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="flex shrink-0 gap-1 rounded-none border-b border-[#EAEFEC] bg-transparent px-4 pt-2">
              <TabsTrigger value="sujet" className="min-w-0">Sujet</TabsTrigger>
              <TabsTrigger value="tests" className="min-w-0 gap-1.5">
                Tests
                <span className="rounded-full bg-[#E3EAE6] px-1.5 text-[11px] font-semibold text-[#5C6B63]">
                  {challenge.publicTests.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="sujet">
                <h2 className="text-[22px] font-extrabold leading-tight">{challenge.title}</h2>
                <p className="mt-1 font-mono text-xs text-[#94A099]">
                  {DIFFICULTY_LABEL[challenge.difficulty] ?? challenge.difficulty} ·{' '}
                  <span className="font-bold text-[#0E9F4A]">+{challenge.maxScore} pts</span>
                </p>
                <div className="mt-4 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#3A453F]">
                  {challenge.statement}
                </div>
              </TabsContent>

              <TabsContent value="tests">
                <h3 className="text-lg font-extrabold">Jeu de tests</h3>
                <p className="mb-4 font-mono text-xs text-[#94A099]">{challenge.publicTests.length} cas public(s)</p>
                {challenge.publicTests.length > 0 ? (
                  <div className="space-y-3">
                    {challenge.publicTests.map((test, i) => (
                      <div key={i} className="space-y-2 rounded-2xl border border-[#EAEFEC] bg-white p-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#D6DED9]" />
                          <span className="text-sm font-bold">Cas {i + 1}</span>
                          <span className="ml-auto rounded-full bg-[#E3F6EA] px-2 py-0.5 text-[11px] font-semibold text-[#0B8F45]">Public</span>
                        </div>
                        {test.stdin && (
                          <div className="font-mono text-xs">
                            <p className="mb-1 text-[#94A099]">IN</p>
                            <pre className="whitespace-pre-wrap rounded-lg bg-[#F3F7F5] p-2 text-[#15241C]">{test.stdin}</pre>
                          </div>
                        )}
                        <div className="font-mono text-xs">
                          <p className="mb-1 text-[#94A099]">OUT</p>
                          <pre className="whitespace-pre-wrap rounded-lg bg-[#F3F7F5] p-2 text-[#15241C]">{test.expectedOutput}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#94A099]">Aucun test public — l&apos;input est fourni à ton programme au lancement.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Poignée + Visualisation (jeux uniquement) */}
          {isGame && (
            <>
              <div
                onMouseDown={(e) => startRowResize(e, 'viz')}
                className="flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-y border-[#EAEFEC] bg-[#F4F8F6] transition hover:bg-[#E6F2EA]"
              >
                <span className="h-[3px] w-11 rounded-full bg-[#C7D0CB]" />
              </div>
              <div style={{ height: vizHeight }} className="flex shrink-0 flex-col bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#94A099]">Visualisation</span>
                  {playResult && (
                    <span className={cn('text-xs font-semibold', playResult.verdict === 'passed' ? 'text-emerald-600' : 'text-rose-500')}>
                      {playResult.verdict === 'passed'
                        ? `✓ Réussi · ${playResult.score} pts`
                        : playResult.verdict === 'failed' ? '✗ Échoué' : '⚠ Erreur'}
                    </span>
                  )}
                </div>
                <div className="min-h-0 flex-1">
                  {replay ? (
                    <ReplayPlayer key={replayKey} replay={replay} viewerFactory={GAME_VIEWERS[slug]} />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#D8E1DC] bg-[#FAFCFB] p-4 text-center text-xs text-[#94A099]">
                      Clique « Jouer » pour lancer ton code et voir le replay.
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
          className="flex w-2.5 shrink-0 cursor-col-resize items-center justify-center bg-[#F4F8F6] transition hover:bg-[#E6F2EA]"
        >
          <span className="h-11 w-[3px] rounded-full bg-[#C7D0CB]" />
        </div>

        {/* ── Colonne droite : éditeur + sortie ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditor language={language} value={code} onChange={setCode} />
          </div>

          <div
            onMouseDown={(e) => startRowResize(e, 'sortie')}
            className="flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-y border-[#EAEFEC] bg-[#F4F8F6] transition hover:bg-[#E6F2EA]"
          >
            <span className="h-[3px] w-11 rounded-full bg-[#C7D0CB]" />
          </div>

          <div style={{ height: sortieHeight }} className="flex shrink-0 flex-col bg-white">
            <div className="flex items-center gap-4 border-b border-[#F1F4F2] px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-[.08em] text-[#15241C]">Sortie</span>
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
    </div>
  )
}
