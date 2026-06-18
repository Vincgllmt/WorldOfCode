'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, CheckCircle2, Lock, Loader2,
  AlertTriangle, ChevronRight, Play, Star,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { getChallenge, runTests, playGame, type TestRunResult } from '@/services/arenaService'
import type { Replay } from '@/components/arena/gameViewer'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ChallengeStatement from '@/components/arena/ChallengeStatement'
import { GAMES } from '../games/registry'
import type { GauntletFrame, GauntletInit } from '../games/platformer/types'
import BadgeUnlockOverlay from '@/components/arena/BadgeUnlockOverlay'
import type { ArenaBadge } from '@/interfaces/arena'

const CodeEditor = dynamic(() => import('@/components/arena/CodeEditor'), { ssr: false })
const ReplayPlayer = dynamic(() => import('@/components/arena/ReplayPlayer'), { ssr: false })

const SLUG = 'platformer'
const TOTAL = 8
const PORTAIL_TYPES = ['SUCCESSOR', 'IS_NEGATIVE', 'ABS', 'MIN', 'SUM', 'REVERSE', 'UNIQUE', 'SORT']


const DEFAULT_CODE: Record<string, string> = {
  python: `import sys\nlines = sys.stdin.read().splitlines()\nportail = lines[0]\ndata = lines[1] if len(lines) > 1 else ""\n\n# Portail 1 — SUCCESSOR\nif portail == "SUCCESSOR":\n    print(int(data) + 1)\n`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n')\nconst portail = lines[0]\nconst data = lines[1] || ''\n\nif (portail === 'SUCCESSOR') console.log(+data + 1)\n`,
  typescript: `const lines = require('fs').readFileSync('/dev/stdin','utf8').split('\\n')\nconst portail = lines[0]\nconst data = lines[1] || ''\n\nif (portail === 'SUCCESSOR') console.log(+data + 1)\n`,
  php: `<?php\n$lines = explode("\\n", trim(file_get_contents("php://stdin")));\n$portail = $lines[0];\n$data = $lines[1] ?? '';\n\nif ($portail === 'SUCCESSOR') echo intval($data) + 1;\n`,
  java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String portail = sc.nextLine();\n        String data = sc.hasNextLine() ? sc.nextLine() : "";\n        if (portail.equals("SUCCESSOR")) System.out.println(Integer.parseInt(data) + 1);\n    }\n}\n`,
  cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string portail, data;\n    getline(cin, portail); getline(cin, data);\n    if (portail == "SUCCESSOR") cout << stoi(data) + 1 << endl;\n    return 0;\n}\n`,
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* Build a preview replay (cameleon standing at start, single block). */
function buildPreview(currentPortail: number): Replay<GauntletInit, GauntletFrame> {
  const init: GauntletInit = {
    problemType: PORTAIL_TYPES[currentPortail],
    inputData:   '',
    obstacleX:   0.5,
  }
  return {
    init,
    frames: [{ cameleonX: 0.05, cameleonY: 0.0, event: 'walk' }],
  }
}

/* Split statement.md into intro + per-portail sections. */
function parseStatementSections(statement: string): { intro: string; portails: string[] } {
  const parts = statement.split(/(?=## Portail \d)/m)
  return { intro: parts[0] ?? '', portails: parts.slice(1) }
}

type PortailResult = { verdict: 'passed' | 'failed' | 'error'; error?: string | null }

export default function PlatformerPage() {
  const { data: challenge, isLoading, error } = useQuery({
    queryKey: ['arena-challenge', SLUG],
    queryFn: () => getChallenge(SLUG),
  })

  const game = GAMES[SLUG]

  const [language, setLanguage]       = useState('')
  const [code, setCode]               = useState('')
  const [currentPortail, setCurrentPortail] = useState(0)          // 0-indexed
  const [portailResults, setPortailResults] = useState<PortailResult[]>([])
  const [running, setRunning]         = useState(false)
  const [winPortail, setWinPortail]   = useState<number | null>(null) // just-won portail index
  const [allDone, setAllDone]         = useState(false)
  const [celebration, setCelebration] = useState<{ badge: ArenaBadge; unlocked: boolean } | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  // Replay queue: each entry = augmented replay for one test
  const [replayQueue, setReplayQueue] = useState<Array<Replay<GauntletInit, GauntletFrame>>>([])
  const [queuePos, setQueuePos]       = useState(0)
  const [runKey, setRunKey]           = useState(0)

  // Panel sizes
  const [leftWidth, setLeftWidth]   = useState(460)
  const [vizHeight, setVizHeight]   = useState(340)

  const sections = useMemo(
    () => parseStatementSections(challenge?.statement ?? ''),
    [challenge?.statement],
  )

  const preview = useMemo(
    () => buildPreview(currentPortail),
    [currentPortail],
  )

  // Init language on first load
  if (challenge && !language) {
    const lang = challenge.languages[0] ?? 'python'
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] ?? '')
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] ?? '')
    resetRun()
  }

  function resetRun() {
    setReplayQueue([])
    setQueuePos(0)
    setRuntimeError(null)
    setWinPortail(null)
  }

  /* Validate current portail: run tests 0..currentPortail. All must pass. */
  async function handleValidate() {
    if (!language || !code.trim() || !challenge) return
    setRunning(true)
    resetRun()

    const results: (TestRunResult | null)[] = []

    try {
      // Run each test independently to get individual replays
      for (let i = 0; i <= currentPortail; i++) {
        const [res] = await runTests(SLUG, language, code, i)
        results.push(res ?? null)
      }

      // Collect verdicts
      const verdicts: PortailResult[] = results.map((r) =>
        r ? { verdict: r.verdict, error: r.error } : { verdict: 'error', error: 'Pas de résultat' },
      )
      setPortailResults(verdicts)

      const firstError = results.find((r) => r?.error)?.error
      if (firstError) setRuntimeError(firstError)

      // Build replay queue: each test gets its own full-width canvas
      const queue: Array<Replay<GauntletInit, GauntletFrame>> = results
        .map((r) => {
          if (!r?.replay) return null
          return {
            init:   r.replay.init as GauntletInit,
            frames: r.replay.frames as GauntletFrame[],
          } satisfies Replay<GauntletInit, GauntletFrame>
        })
        .filter((r): r is Replay<GauntletInit, GauntletFrame> => r !== null)

      setReplayQueue(queue)
      setQueuePos(0)
      setRunKey((k) => k + 1)

      // Check if all passed
      const allPassed = verdicts.every((v) => v.verdict === 'passed')
      if (allPassed) {
        if (currentPortail === TOTAL - 1) {
          // All 8 done! Submit to record the win
          setAllDone(true)
          try {
            const sub = await playGame(SLUG, language, code)
            const badge: ArenaBadge = {
              badgeId:       0,
              name:          sub.badgesAwarded.length > 0 ? sub.badgesAwarded.join(' · ') : 'Cameleon Bros',
              description:   null,
              icon:          null,
              challengeSlug: SLUG,
              awardedAt:     new Date().toISOString(),
            }
            setCelebration({ badge, unlocked: sub.badgesAwarded.length > 0 })
          } catch {
            // Celebration even if submit fails
            setCelebration({
              badge: { badgeId: 0, name: 'Tous les portails franchis !', description: null, icon: null, challengeSlug: SLUG, awardedAt: new Date().toISOString() },
              unlocked: false,
            })
          }
        } else {
          setWinPortail(currentPortail)
        }
      }
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setRunning(false)
    }
  }

  function handleContinue() {
    setWinPortail(null)
    setCurrentPortail((p) => p + 1)
    setPortailResults([])
    resetRun()
  }

  /* Advance replay queue: stop on first failed portail. */
  function advanceReplay() {
    if (portailResults[queuePos]?.verdict !== 'passed') return
    if (queuePos < replayQueue.length - 1) {
      setQueuePos((p) => p + 1)
    }
  }

  /* Resize handles */
  function startColResize(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX, startW = leftWidth
    const move = (ev: MouseEvent) => setLeftWidth(clamp(startW + ev.clientX - startX, 300, 800))
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); document.body.style.userSelect = '' }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    document.body.style.userSelect = 'none'
  }

  function startRowResize(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY, startH = vizHeight
    const move = (ev: MouseEvent) => setVizHeight(clamp(startH - (ev.clientY - startY), 140, 500))
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); document.body.style.userSelect = '' }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    document.body.style.userSelect = 'none'
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Chargement…</div>
      </div>
    )
  }
  if (error || !challenge) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-rose-500">
        <AlertTriangle className="mr-2 h-4 w-4" /> Défi introuvable.
      </div>
    )
  }

  const currentReplay = replayQueue[queuePos] ?? null
  const busy = running

  return (
    <div className="flex h-full flex-col bg-[#FBFDFC] text-[#15241C]">

      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#EAEFEC] bg-white px-6 py-3">
        <Link href="/arena" className="flex items-center gap-1 text-sm text-[#5C6B63] hover:text-[#0E9F4A]">
          <ChevronLeft className="h-4 w-4" /> Arena
        </Link>
        <span className="text-[#C0C9C3]">/</span>
        <span className="truncate text-sm font-semibold">{challenge.title}</span>
        <span className="rounded-full bg-[#E3F6EA] px-2 py-0.5 text-[11.5px] font-bold text-[#0B8F45]">Facile</span>

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
            onClick={handleValidate}
            disabled={busy || !code.trim() || allDone}
            className="gap-1.5 bg-[#11A84F] text-white shadow-[0_6px_16px_-6px_rgba(17,168,79,.6)] hover:bg-[#0E9F4A]"
          >
            {running
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5" />}
            {running ? 'Validation…' : `Valider Portail ${currentPortail + 1}`}
          </Button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Left panel ── */}
        <div style={{ width: leftWidth }} className="flex min-h-0 shrink-0 flex-col border-r border-[#EAEFEC]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Portail progress list */}
            <div className="border-b border-[#EAEFEC] px-4 py-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#94A099]">Progression</p>
              <div className="flex flex-wrap gap-1.5">
                {PORTAIL_TYPES.map((type, i) => {
                  const done    = i < currentPortail || (i === currentPortail && portailResults[i]?.verdict === 'passed' && winPortail === null && allDone)
                  const current = i === currentPortail
                  const locked  = i > currentPortail
                  const failed  = portailResults[i]?.verdict !== undefined && portailResults[i].verdict !== 'passed'
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        done    && 'bg-emerald-100 text-emerald-700',
                        current && !done && !failed && 'bg-[#11A84F] text-white',
                        current && failed && 'bg-rose-100 text-rose-600',
                        locked  && 'bg-[#F0F3F1] text-[#9AA6A0]',
                      )}
                    >
                      {done   ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {locked ? <Lock className="h-3 w-3" /> : null}
                      {i + 1}. {type}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Win banner */}
            {winPortail !== null && (
              <div className="mx-4 mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-emerald-700">Portail {winPortail + 1} réussi !</p>
                    <p className="text-xs text-emerald-600">
                      Portail {winPortail + 2} — {PORTAIL_TYPES[winPortail + 1]} — débloqué.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleContinue}
                    className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Continuer <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Runtime error */}
            {runtimeError && (
              <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-all font-mono text-xs">{runtimeError}</span>
              </div>
            )}

            {/* Failed portails */}
            {portailResults.some((r) => r.verdict !== 'passed') && winPortail === null && !allDone && (
              <div className="mx-4 mt-3 space-y-1">
                {portailResults.map((r, i) =>
                  r.verdict !== 'passed' ? (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
                      <span className="font-semibold">Portail {i + 1} ({PORTAIL_TYPES[i]})</span>
                      <span className="ml-auto text-rose-400">{r.verdict === 'error' ? 'Erreur' : 'Échoué'}</span>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {/* Current portail statement */}
            <div className="px-5 py-4">
              <div className="rounded-2xl border border-[#E5EDE8] bg-[#F5F9F7] p-4">
                <ChallengeStatement
                  statement={sections.portails[currentPortail] ?? ''}
                  hideLeadingTitle={false}
                />
              </div>
            </div>
          </div>

          {/* ── Visualization ── */}
          <div
            onMouseDown={startRowResize}
            className="flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-y border-[#EAEFEC] bg-[#F4F8F6] hover:bg-[#E6F2EA]"
          >
            <span className="h-[3px] w-11 rounded-full bg-[#C7D0CB]" />
          </div>
          <div style={{ height: vizHeight }} className="flex shrink-0 flex-col bg-white p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#94A099]">Visualisation</span>
              {currentReplay && (
                <span className="text-xs text-[#5C6B63]">
                  Portail {queuePos + 1} / {currentPortail + 1}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1">
              {currentReplay ? (
                <ReplayPlayer
                  key={`run-${runKey}-${queuePos}`}
                  replay={currentReplay}
                  viewerFactory={game.createViewer}
                  onEnded={advanceReplay}
                />
              ) : (
                <ReplayPlayer
                  key={`preview-${currentPortail}`}
                  replay={preview}
                  viewerFactory={game.createViewer}
                  autoPlay={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Resize handle ── */}
        <div
          onMouseDown={startColResize}
          className="flex w-2.5 shrink-0 cursor-col-resize items-center justify-center bg-[#F4F8F6] hover:bg-[#E6F2EA]"
        >
          <span className="h-11 w-[3px] rounded-full bg-[#C7D0CB]" />
        </div>

        {/* ── Code editor ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditor language={language} value={code} onChange={setCode} />
          </div>

          {/* Stderr panel */}
          {runtimeError === null && portailResults.length > 0 && !portailResults.every((r) => r.verdict === 'passed') && (
            <div className="shrink-0 border-t border-[#EAEFEC] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#94A099]">Sortie</p>
              <div className="mt-2 space-y-1">
                {portailResults.map((r, i) =>
                  r.verdict === 'passed' ? (
                    <div key={i} className="flex items-center gap-2 font-mono text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Portail {i + 1} ({PORTAIL_TYPES[i]}) — réussi
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-2 font-mono text-xs text-rose-500">
                      <span className="h-3.5 w-3.5 text-center font-bold">✗</span>
                      Portail {i + 1} ({PORTAIL_TYPES[i]}) — échoué
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {allDone && !celebration && (
            <div className="shrink-0 border-t border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold">Tous les portails franchis !</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen celebration for completing all 8 portails */}
      <BadgeUnlockOverlay
        badge={celebration?.badge ?? null}
        unlocked={celebration?.unlocked ?? false}
        onClose={() => setCelebration(null)}
      />
    </div>
  )
}
