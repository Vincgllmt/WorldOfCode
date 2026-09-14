'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Play, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminChallenges, useAdminChallengeDetail, useVerifySolution } from '@/hooks/useAdminChallenges'
import type { AdminChallengeDetail, ChallengeDifficulty, SolutionVerification } from '@/interfaces/adminChallenge'

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy:   'Facile',
  medium: 'Moyen',
  hard:   'Difficile',
}

const DIFFICULTY_STYLES: Record<ChallengeDifficulty, string> = {
  easy:   'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard:   'bg-red-500/10 text-red-600 dark:text-red-400',
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python:     'Python',
  php:        'PHP',
  java:       'Java',
  cpp:        'C++',
}

const languageLabel = (language: string) => LANGUAGE_LABELS[language] ?? language

function DifficultyBadge({ difficulty }: { difficulty: ChallengeDifficulty }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${DIFFICULTY_STYLES[difficulty] ?? 'bg-muted text-muted-foreground'}`}>
      {DIFFICULTY_LABELS[difficulty] ?? difficulty}
    </span>
  )
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function CodeBlock({ code, maxHeight = 'max-h-96' }: { code: string; maxHeight?: string }) {
  return (
    <pre className={`text-xs font-mono leading-relaxed bg-muted/40 rounded-xl px-4 py-3 overflow-auto ${maxHeight}`}>
      <code>{code}</code>
    </pre>
  )
}

function VerificationResult({ result }: { result: SolutionVerification }) {
  const passed = result.verdict === 'passed'
  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 ${passed ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {passed
          ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          : <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
        {result.testsPassed} / {result.testsTotal} cas réussis
      </div>
      <div className="flex flex-wrap gap-1.5">
        {result.results.map(r => (
          <span
            key={r.index}
            title={r.error ?? r.playerStderr ?? undefined}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              r.verdict === 'passed'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            #{r.index + 1} {r.verdict === 'passed' ? '✓' : '✗'} {r.score}
          </span>
        ))}
      </div>
      {result.results.some(r => r.error) && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {result.results.filter(r => r.error).map(r => (
            <li key={r.index}><span className="font-mono">#{r.index + 1}</span> — {r.error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SolutionsTab({ detail }: { detail: AdminChallengeDetail }) {
  const verify = useVerifySolution()
  const [verifying, setVerifying] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SolutionVerification>>({})

  if (detail.solutions.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground/70 py-6 text-center">
        Aucune solution de référence. Ajoutez un fichier <span className="font-mono">solution.&lt;ext&gt;.txt</span> dans{' '}
        <span className="font-mono">code-arena/games/{detail.slug}/</span>.
      </p>
    )
  }

  const handleVerify = async (language: string) => {
    setVerifying(language)
    try {
      const result = await verify.mutateAsync({ slug: detail.slug, language })
      setResults(prev => ({ ...prev, [language]: result }))
      if (result.verdict === 'passed') toast.success(`Solution ${languageLabel(language)} : ${result.testsPassed}/${result.testsTotal} cas`)
      else toast.error(`Solution ${languageLabel(language)} : ${result.testsPassed}/${result.testsTotal} cas`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la vérification')
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="space-y-5">
      {detail.solutions.map(solution => {
        const isVerifying = verifying === solution.language
        return (
          <div key={solution.language} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">
                {languageLabel(solution.language)}
              </span>
              <button
                onClick={() => handleVerify(solution.language)}
                disabled={verifying !== null || detail.tests.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {isVerifying ? 'Vérification…' : `Vérifier sur ${detail.tests.length} cas`}
              </button>
            </div>
            {results[solution.language] && <VerificationResult result={results[solution.language]} />}
            <CodeBlock code={solution.code} />
          </div>
        )
      })}
    </div>
  )
}

export default function AdminCodeArenaPanel() {
  const [search, setSearch]             = useState('')
  const [difficulty, setDifficulty]     = useState<ChallengeDifficulty | undefined>(undefined)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const { challenges, isLoading, error } = useAdminChallenges()
  const { detail, isLoading: loadingDetail } = useAdminChallengeDetail(selectedSlug)

  const filtered = challenges.filter(c => {
    if (difficulty && c.difficulty !== difficulty) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive flex items-center gap-2"><span>⚠</span>{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtre difficulté */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un jeu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          {([
            { label: 'Tous', value: undefined },
            { label: 'Facile', value: 'easy' },
            { label: 'Moyen', value: 'medium' },
            { label: 'Difficile', value: 'hard' },
          ] as const).map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setDifficulty(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                difficulty === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} jeu{filtered.length > 1 ? 'x' : ''}</span>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Aucun jeu trouvé.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Jeu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Difficulté</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Langages</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Cas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Solutions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Soumissions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Résolu par</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedSlug(c.slug)}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3"><DifficultyBadge difficulty={c.difficulty} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.languages.map(l => (
                        <span key={l} className="px-1.5 py-0.5 text-[11px] rounded bg-muted text-muted-foreground">{languageLabel(l)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{c.testsCount}</td>
                  <td className="px-4 py-3">
                    {c.solutionLanguages.length === 0
                      ? <span className="text-xs italic text-muted-foreground/60">Aucune</span>
                      : (
                        <div className="flex flex-wrap gap-1">
                          {c.solutionLanguages.map(l => (
                            <span key={l} className="px-1.5 py-0.5 text-[11px] rounded bg-primary/10 text-primary">{languageLabel(l)}</span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-sm">{c.submissionsCount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-sm">{c.solvedByCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Panel détail */}
      <Sheet open={!!selectedSlug} onOpenChange={open => { if (!open) setSelectedSlug(null) }}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">{detail?.title ?? 'Jeu'}</SheetTitle>
          </SheetHeader>

          {loadingDetail ? (
            <div className="py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : detail && (
            <div className="py-5 space-y-6">
              {/* Méta */}
              <div className="flex items-center gap-2 flex-wrap">
                <DifficultyBadge difficulty={detail.difficulty} />
                <span className="text-xs text-muted-foreground font-mono">{detail.slug}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  Sync le {new Date(detail.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatBlock label="Score max" value={detail.maxScore} />
                <StatBlock label="Cas de test" value={detail.tests.length} />
                <StatBlock label="Solutions" value={detail.solutions.length} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {detail.languages.map(l => (
                  <span key={l} className="px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground font-medium">{languageLabel(l)}</span>
                ))}
              </div>

              <Tabs defaultValue="solutions">
                <TabsList className="w-full">
                  <TabsTrigger value="solutions" className="flex-1">Solutions</TabsTrigger>
                  <TabsTrigger value="tests" className="flex-1">Cas de test</TabsTrigger>
                  <TabsTrigger value="referee" className="flex-1">Referee</TabsTrigger>
                  <TabsTrigger value="statement" className="flex-1">Énoncé</TabsTrigger>
                </TabsList>

                <TabsContent value="solutions" className="pt-4">
                  <SolutionsTab key={detail.slug} detail={detail} />
                </TabsContent>

                <TabsContent value="tests" className="pt-4 space-y-3">
                  {detail.tests.length === 0
                    ? <p className="text-sm italic text-muted-foreground/70 py-6 text-center">Aucun cas de test.</p>
                    : detail.tests.map(t => (
                      <div key={t.position} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Cas #{t.position + 1}</p>
                        <CodeBlock code={t.stdin ?? ''} maxHeight="max-h-40" />
                      </div>
                    ))}
                </TabsContent>

                <TabsContent value="referee" className="pt-4 space-y-2">
                  {detail.refereeCode
                    ? (
                      <>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">
                          {languageLabel(detail.refereeLanguage ?? '')}
                        </span>
                        <CodeBlock code={detail.refereeCode} />
                      </>
                    )
                    : <p className="text-sm italic text-muted-foreground/70 py-6 text-center">Aucun referee configuré.</p>}
                </TabsContent>

                <TabsContent value="statement" className="pt-4">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-xl px-4 py-3 font-sans">{detail.statement}</pre>
                </TabsContent>
              </Tabs>

              {/* Badges */}
              {detail.badges.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Badges</h3>
                  <div className="rounded-xl border border-border divide-y divide-border">
                    {detail.badges.map(b => (
                      <div key={b.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{b.name}</p>
                          {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{b.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
