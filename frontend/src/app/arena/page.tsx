'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { useArenaChallenges, useArenaLeaderboard } from '@/hooks/useArenaChallenges'
import { useAuth } from '@/hooks/useAuth'
import { ArenaChallenge, ChallengeDifficulty, LeaderboardEntry } from '@/interfaces/arena'
import { Skeleton } from '@/components/ui/skeleton'

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

const DIFF_PILL: Record<ChallengeDifficulty, string> = {
  easy: 'bg-[#E3F6EA] text-[#0B8F45]',
  medium: 'bg-[#FCEFDD] text-[#C76A10]',
  hard: 'bg-[#FBE4E4] text-[#D02B2B]',
}

// Covers génératifs (dégradé + glyphe), choisis de façon déterministe par slug.
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

const RANK_BADGE = [
  'bg-[#F6C84C] text-[#5A3D00]',
  'bg-[#CFD6DC] text-[#3A444C]',
  'bg-[#E2A877] text-[#4A2A0E]',
]

const titleForLevel = (lvl: number) =>
  lvl >= 10 ? 'Maître du code' : lvl >= 7 ? 'Codeur confirmé' : lvl >= 4 ? 'Apprenti' : 'Débutant'

const fr = (n: number) => n.toLocaleString('fr-FR')

/* ---------- Page ---------- */

export default function ArenaPage() {
  const { challenges, isLoading } = useArenaChallenges()
  const { leaderboard } = useArenaLeaderboard()
  const { user } = useAuth()

  const [activeFilter, setActiveFilter] = useState<ChallengeDifficulty | 'all'>('all')
  const [search, setSearch] = useState('')

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
  const playerName = user?.username ?? 'toi'

  const podium = board.slice(0, 3)

  const filtered = useMemo<ArenaChallenge[]>(() => {
    return list.filter((c) => {
      const matchDiff = activeFilter === 'all' || c.difficulty === activeFilter
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
      return matchDiff && matchSearch
    })
  }, [list, activeFilter, search])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ---------- Hero : progression + podium ---------- */}
      <section className="relative flex flex-col gap-7 overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#0A9245_0%,#13AE54_50%,#1FC465_100%)] p-7 sm:flex-row sm:gap-7 sm:p-9">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.13) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Progression */}
        <div className="relative min-w-0 sm:flex-[1.4]">
          <div className="mb-2 text-[13.5px] font-semibold text-white/80">Bon retour, {playerName}</div>
          <h2 className="font-mono text-3xl font-bold tracking-tight text-white">Niveau {level}</h2>
          <div className="mb-5 mt-1 text-[15px] text-white/90">
            {titleForLevel(level)} · {solvedCount} défi{solvedCount > 1 ? 's' : ''} résolu{solvedCount > 1 ? 's' : ''}
          </div>

          <div className="mb-2 flex max-w-[460px] justify-between font-mono text-xs text-white/85">
            <span>{fr(score)} XP</span>
            <span>
              Niveau {level + 1} · {fr(nextThreshold)} XP
            </span>
          </div>
          <div className="h-[11px] max-w-[460px] overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="rounded-[11px] border border-white/[0.28] bg-white/[0.18] px-[15px] py-2 text-[13px] font-semibold text-white">
              ✦ {list.length} défi{list.length > 1 ? 's' : ''} disponible{list.length > 1 ? 's' : ''}
            </span>
            {list[0] && (
              <Link
                href={`/arena/${(list.find((c) => !c.solved) ?? list[0]).slug}`}
                className="rounded-[11px] bg-white px-[15px] py-2 text-[13px] font-bold text-[#0E9F4A] transition hover:bg-white/90"
              >
                Reprendre l&apos;entraînement →
              </Link>
            )}
          </div>
        </div>

        {/* Podium */}
        <div className="relative w-full rounded-[18px] border border-white/[0.24] bg-white/[0.14] px-[18px] pb-2.5 pt-[18px] sm:w-[300px] sm:flex-[0_0_300px]">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-bold text-white">Top classement</span>
            <span className="text-xs text-white/75">Semaine</span>
          </div>

          {podium.length === 0 ? (
            <p className="py-4 text-[13px] text-white/75">Aucun classement pour l&apos;instant.</p>
          ) : (
            podium.map((p, i) => (
              <div key={p.userId} className="flex items-center gap-[11px] py-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                    RANK_BADGE[i] ?? 'bg-[#EEF2F0] text-[#7A857E]'
                  }`}
                >
                  {p.rank}
                </span>
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold ${
                    p.isCurrentUser ? 'bg-[#0E9F4A] text-white' : 'bg-[#E8EDEA] text-[#3A453F]'
                  }`}
                >
                  {p.username.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-[13.5px] font-semibold text-white">
                  {p.isCurrentUser ? `Toi · ${p.username}` : p.username}
                </span>
                <span className="font-mono text-[12.5px] font-bold text-white">{fr(p.totalScore)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ---------- Barre de filtres ---------- */}
      <div className="my-[22px] mt-[26px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-[13px] border border-[#E6ECE8] bg-[#F2F6F3] p-1">
          {DIFF_FILTERS.map((f) => {
            const active = activeFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`rounded-[10px] px-[18px] py-[9px] text-[13.5px] transition ${
                  active ? 'bg-[#11A84F] font-bold text-white' : 'font-semibold text-[#3A453F]'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#E6ECE8] bg-[#F7FAF8] px-4 py-[11px] sm:w-[280px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA6A0" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-transparent text-sm text-[#15241C] placeholder:text-[#9AA6A0] focus:outline-none"
          />
        </div>
      </div>

      {/* ---------- Grille de cartes ---------- */}
      <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-[#94A099]">Aucun défi trouvé.</p>
        ) : (
          filtered.map((challenge) => {
            const cover = coverFor(challenge.slug)
            return (
              <Link
                key={challenge.id}
                href={`/arena/${challenge.slug}`}
                className="group block overflow-hidden rounded-[20px] border border-[#E8EEEA] bg-white shadow-[0_2px_6px_rgba(16,40,30,.05)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_-18px_rgba(13,60,33,.32)]"
              >
                {/* Cover */}
                <div className="relative h-[188px]">
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
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[76px] font-bold text-white/25">
                      {cover.glyph}
                    </div>
                  )}
                  {/* Voile bas */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,28,16,.8)_0%,rgba(6,28,16,.18)_45%,transparent_70%)]" />

                  {/* Badge points */}
                  <div className="absolute right-[13px] top-[13px] flex items-center gap-1.5 rounded-[9px] bg-white/[0.94] px-[11px] py-[5px] font-mono text-[12.5px] font-bold text-[#0E9F4A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0E9F4A]" />
                    {challenge.maxScore} pts
                  </div>

                  {/* Bas du cover : difficulté + titre */}
                  <div className="absolute inset-x-4 bottom-[15px]">
                    <div className="mb-[9px]">
                      <span
                        className={`inline-block whitespace-nowrap rounded-[20px] px-[11px] py-1 text-[11.5px] font-bold ${DIFF_PILL[challenge.difficulty]}`}
                      >
                        {DIFF_LABEL[challenge.difficulty]}
                      </span>
                    </div>
                    <h3 className="m-0 text-[19px] font-bold tracking-tight text-white">{challenge.title}</h3>
                  </div>
                </div>

                {/* Corps */}
                <div className="px-[18px] pb-[18px] pt-4">
                  <div className="mb-1.5 flex justify-between font-mono text-[11px] text-[#94A099]">
                    <span>Taux de réussite</span>
                    <span className="shrink-0">{challenge.successRate}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#EDF2EF]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#12A24F,#26C46B)] transition-[width] duration-700"
                      style={{ width: `${challenge.successRate}%` }}
                    />
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
