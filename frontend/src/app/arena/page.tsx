'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

import { useArenaChallenges, useArenaLeaderboard, useUserBadges } from '@/hooks/useArenaChallenges'
import { useAuth } from '@/hooks/useAuth'
import { ArenaChallenge, ChallengeDifficulty, LeaderboardEntry } from '@/interfaces/arena'
import { Skeleton } from '@/components/ui/skeleton'
import ArenaBadgeMedal, { ArenaMedalDefs } from '@/components/arena/ArenaBadgeMedal'
import BadgeMedal from '@/components/arena/BadgeMedal'

/* ---------- Design tokens ---------- */

const DIFF_FILTERS: { value: ChallengeDifficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
]

const DIFF_LABEL: Record<ChallengeDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

// Pastilles de difficulté : couleurs *sémantiques* (vert/orange/rouge) posées
// sur la cover colorée du défi — contexte image, indépendant du thème. Ce sont
// des chips auto-portants (fond + texte), lisibles sur n'importe quelle cover.
const DIFF_PILL: Record<ChallengeDifficulty, string> = {
  easy: 'bg-[#E3F6EA] text-[#0B8F45]',
  medium: 'bg-[#FCEFDD] text-[#C76A10]',
  hard: 'bg-[#FBE4E4] text-[#D02B2B]',
}

// Covers génératifs (dégradé + glyphe), choisis de façon déterministe par slug.
// Surfaces décoratives façon « image » : couleurs fixes (le texte blanc posé
// dessus doit contraster avec la cover, pas avec le thème de la page).
const COVERS = [
  { bg: 'linear-gradient(135deg,#12A24F,#2ECC72)', glyph: 'Σ' },
  { bg: 'linear-gradient(135deg,#0FA07A,#1FC79A)', glyph: '#' },
  { bg: 'linear-gradient(135deg,#3DB06A,#84D38F)', glyph: '⇄' },
  { bg: 'linear-gradient(135deg,#0B7A4E,#129A5A)', glyph: '⚡' },
  { bg: 'linear-gradient(135deg,#17A85C,#57CB85)', glyph: '[ ]' },
  { bg: 'linear-gradient(135deg,#0E9472,#2FBE96)', glyph: '{ }' },
]

const coverFor = (slug: string) => {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

// Médailles de podium (or / argent / bronze) : chips sémantiques auto-portants.
const RANK_BADGE = [
  'bg-[#F6C84C] text-[#5A3D00]',
  'bg-[#CFD6DC] text-[#3A444C]',
  'bg-[#E2A877] text-[#4A2A0E]',
]

const titleForLevel = (lvl: number) =>
  lvl >= 10 ? 'Maître du code' : lvl >= 7 ? 'Codeur confirmé' : lvl >= 4 ? 'Apprenti' : 'Débutant'

const fr = (n: number) => n.toLocaleString('fr-FR')

// Dégradé de la bannière niveau adapté au thème (texte blanc sur surface
// colorée) : vert pour light/dark, cyan→violet pour les thèmes cyberpunk.
const HERO_GRADIENT = {
  base: 'linear-gradient(118deg,#0a9245 0%,#13ae54 52%,#1fc465 100%)',
  cyber: 'linear-gradient(118deg,#06b6d4 0%,#4f46e5 50%,#a855f7 100%)',
}

const LEADERS_PREVIEW = 5

/* ---------- Page ---------- */

export default function ArenaPage() {
  const { challenges, isLoading } = useArenaChallenges()
  const { leaderboard } = useArenaLeaderboard()
  const { user } = useAuth()
  const { badges: myBadges } = useUserBadges(user?.id ?? 0)
  const { resolvedTheme } = useTheme()
  const heroBg = resolvedTheme?.startsWith('cyberpunk') ? HERO_GRADIENT.cyber : HERO_GRADIENT.base

  const [activeFilter, setActiveFilter] = useState<ChallengeDifficulty | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAllLeaders, setShowAllLeaders] = useState(false)

  const list = challenges ?? []
  const board: LeaderboardEntry[] = leaderboard ?? []

  const solvedCount = useMemo(() => list.filter((c) => c.solved).length, [list])

  // Progression dérivée du score réel (500 XP par niveau).
  const me = board.find((e) => e.isCurrentUser)
  const score = me?.totalScore ?? 0
  const level = Math.floor(score / 500) + 1
  const xpInto = score - (level - 1) * 500
  const xpPct = Math.min(100, Math.round((xpInto / 500) * 100))
  const nextThreshold = level * 500
  const xpRemaining = Math.max(0, nextThreshold - score)

  // Mes badges : un emplacement par défi (catalogue réel). Débloqué si l'utilisateur
  // possède le badge associé au slug, verrouillé sinon.
  const badgeSlots = useMemo(
    () =>
      list.map((c) => {
        const badge = (myBadges ?? []).find((b) => b.challengeSlug === c.slug)
        return { challenge: c, badge, earned: !!badge }
      }),
    [list, myBadges],
  )
  const earnedCount = badgeSlots.filter((s) => s.earned).length

  const leadersShown = showAllLeaders ? board : board.slice(0, LEADERS_PREVIEW)

  const filtered = useMemo<ArenaChallenge[]>(() => {
    return list.filter((c) => {
      const matchDiff = activeFilter === 'all' || c.difficulty === activeFilter
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
      return matchDiff && matchSearch
    })
  }, [list, activeFilter, search])

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-[22px]">
        <div className="flex flex-col gap-[22px] lg:flex-row">
          <div className="flex flex-1 flex-col gap-[22px]">
            <Skeleton className="h-44 w-full rounded-[20px]" />
            <Skeleton className="h-52 w-full rounded-[20px]" />
          </div>
          <Skeleton className="h-auto min-h-[200px] w-full rounded-[20px] lg:w-[340px]" />
        </div>
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <ArenaMedalDefs />

      {/* ---------- Hero : niveau + badges (gauche) · classement (droite) ---------- */}
      <section className="flex flex-col gap-[22px] lg:flex-row lg:items-stretch">
        {/* Colonne gauche */}
        <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
          {/* Bannière niveau */}
          <div
            style={{ background: heroBg }}
            className="relative flex flex-col justify-center gap-[18px] overflow-hidden rounded-[20px] px-7 py-6 shadow-[0_20px_44px_-24px_rgba(13,60,33,.5)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,.13) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />

            <div className="relative flex items-center gap-[18px]">
              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[17px] border border-white/[0.34] bg-white/[0.16] font-mono text-[25px] font-bold text-white">
                {level}
              </div>
              <div className="min-w-0">
                <h1 className="m-0 font-mono text-[25px] font-bold tracking-tight text-white">
                  Niveau {level}
                </h1>
                <div className="mt-0.5 text-sm text-white/90">
                  {titleForLevel(level)} · {solvedCount} défi{solvedCount > 1 ? 's' : ''} résolu
                  {solvedCount > 1 ? 's' : ''}
                </div>
              </div>
              <span className="ml-auto inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-xl border border-white/30 bg-white/[0.18] px-4 py-2.5 text-[13.5px] font-bold text-white">
                ✦ {list.length} défi{list.length > 1 ? 's' : ''} disponible{list.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="relative">
              <div className="mb-2 flex items-baseline justify-between font-mono text-xs text-white/[0.88]">
                <span className="font-bold text-white">{fr(score)} XP</span>
                <span>
                  Niveau {level + 1} · {fr(nextThreshold)} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.24]">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-700"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="mt-2.5 text-[12.5px] text-white/[0.82]">
                Plus que <b className="text-white">{fr(xpRemaining)} XP</b> avant le niveau {level + 1}
              </div>
            </div>
          </div>

          {/* Mes badges */}
          <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,40,30,.04)]">
            <div className="mb-5 flex items-baseline justify-between">
              <div className="text-[13px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                Mes badges
              </div>
              <div className="font-mono text-xs font-bold text-primary">
                {earnedCount} / {badgeSlots.length} débloqués
              </div>
            </div>

            {badgeSlots.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Aucun badge à débloquer pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
                {badgeSlots.map(({ challenge, badge, earned }) => (
                  <div key={challenge.id} className="flex flex-col items-center text-center">
                    {earned && badge?.icon ? (
                      <BadgeMedal badge={badge} size={84} />
                    ) : (
                      <ArenaBadgeMedal earned={earned} size={84} />
                    )}
                    <div
                      className={`mt-2.5 text-[13.5px] font-extrabold tracking-tight ${
                        earned ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {badge?.name ?? challenge.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                      {DIFF_LABEL[challenge.difficulty]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : classement */}
        <div className="flex w-full flex-col rounded-[20px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,40,30,.04)] lg:w-[340px] lg:flex-none">
          <div className="mb-3 text-[13px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            Top classement
          </div>

          <div className="flex flex-1 flex-col gap-1">
            {leadersShown.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Aucun classement pour l&apos;instant.</p>
            ) : (
              leadersShown.map((p) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-[11px] rounded-xl px-[11px] py-2.5 ${
                    p.isCurrentUser
                      ? 'border border-primary/30 bg-primary/10'
                      : 'border border-transparent'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      RANK_BADGE[p.rank - 1] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.rank}
                  </span>
                  <span
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold ${
                      p.isCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    }`}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">
                    {p.isCurrentUser ? `Toi · ${p.username}` : p.username}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-primary">
                    {fr(p.totalScore)}
                    <span className="font-medium text-muted-foreground"> pts</span>
                  </span>
                </div>
              ))
            )}
          </div>

          {board.length > LEADERS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllLeaders((v) => !v)}
              className="mt-3 border-t border-border pt-3 text-center text-[13px] font-bold text-primary transition hover:opacity-80"
            >
              {showAllLeaders ? 'Réduire le classement' : 'Voir le classement complet →'}
            </button>
          )}
        </div>
      </section>

      {/* ---------- En-tête défis + filtres + recherche ---------- */}
      <div className="mb-5 mt-[34px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3.5">
          <h2 className="m-0 text-[19px] font-extrabold tracking-tight text-foreground">Défis</h2>
          <span className="font-mono text-[12.5px] text-muted-foreground">
            {filtered.length} disponible{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-[13px] border border-border bg-muted p-1">
            {DIFF_FILTERS.map((f) => {
              const active = activeFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`rounded-[10px] px-[17px] py-[9px] text-[13.5px] transition ${
                    active
                      ? 'bg-primary font-bold text-primary-foreground'
                      : 'font-semibold text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-card px-4 py-[11px] sm:w-[248px]">
            <svg
              className="text-muted-foreground"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ---------- Grille de défis ---------- */}
      <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">Aucun défi trouvé.</p>
        ) : (
          filtered.map((challenge) => {
            const cover = coverFor(challenge.slug)
            return (
              <Link
                key={challenge.id}
                href={`/arena/${challenge.slug}`}
                className="group block overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_6px_rgba(16,40,30,.05)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_-18px_rgba(13,60,33,.32)]"
              >
                {/* Cover plein-cadre (vignette du jeu) */}
                <div className="relative h-[250px]">
                  {challenge.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={challenge.image} alt={challenge.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: cover.bg }} />
                  )}
                  {/* Motif de points */}
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(255,255,255,.16) 1px, transparent 1px)',
                      backgroundSize: '14px 14px',
                    }}
                  />
                  {/* Glyphe */}
                  {!challenge.image && (
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[72px] font-bold text-white/25">
                      {cover.glyph}
                    </div>
                  )}
                  {/* Voile bas */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,28,16,.8)_0%,rgba(6,28,16,.18)_45%,transparent_70%)]" />

                  {/* Badge points (pastille blanche sur la cover — contexte image) */}
                  <div className="absolute right-[13px] top-[13px] flex items-center gap-1.5 rounded-[9px] bg-white/[0.94] px-[11px] py-[5px] font-mono text-[12.5px] font-bold text-[#0E9F4A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0E9F4A]" />
                    {challenge.maxScore} pts
                  </div>

                  {/* Difficulté + titre (padding droit pour laisser place au cartouche) */}
                  <div className="absolute inset-x-4 bottom-[15px] pr-[150px]">
                    <div className="mb-[9px]">
                      <span
                        className={`inline-block whitespace-nowrap rounded-[20px] px-[11px] py-1 text-[11.5px] font-bold ${DIFF_PILL[challenge.difficulty]}`}
                      >
                        {DIFF_LABEL[challenge.difficulty]}
                      </span>
                    </div>
                    <h3 className="m-0 text-[19px] font-bold tracking-tight text-white">{challenge.title}</h3>
                  </div>

                  {/* Cartouche taux de réussite — verre dépoli posé sur la vignette
                      (contexte image : couleurs fixes, pas de tokens de thème) */}
                  <div className="absolute bottom-[15px] right-4 w-[138px] rounded-[11px] bg-black/30 px-3 py-2 ring-1 ring-white/15 backdrop-blur-md">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[.06em] text-white/75">Réussite</span>
                      <span className="font-mono text-[13px] font-bold leading-none text-white">{challenge.successRate}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#26C46B,#8BEFB1)] transition-[width] duration-700"
                        style={{ width: `${challenge.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
