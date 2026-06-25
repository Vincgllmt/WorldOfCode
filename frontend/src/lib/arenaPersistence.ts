import type { PlayResult, SubmitResult, TestRunResult } from '@/services/arenaService'

/**
 * Persistance locale (localStorage) du travail d'un joueur sur un défi Code Arena :
 *   - le code écrit, par défi ET par langage (une clé par langage, rien n'est écrasé en changeant) ;
 *   - le dernier langage choisi, pour rouvrir le défi sur le bon éditeur ;
 *   - l'avancement (verdicts par cas, résumé d'essai, résultat noté).
 *
 * Objectif : retrouver son code / son langage / son avancement au rechargement de la
 * page ou lors d'une visite ultérieure. Toutes les fonctions sont sans effet côté serveur
 * (garde `typeof window`) et avalent silencieusement les erreurs de stockage
 * (quota dépassé, navigation privée).
 */

/**
 * Identifiant du joueur courant pour cloisonner le stockage : les clés sont
 * préfixées par cet identifiant afin qu'un autre compte connecté sur le même
 * navigateur ne récupère PAS le code / langage / avancement (verdicts de tests)
 * du compte précédent. `null`/`undefined` (déconnecté) → espace « guest ».
 */
export type UserScope = number | string | null | undefined
const scope = (userId: UserScope) => (userId == null ? 'guest' : String(userId))

export const codeStorageKey = (userId: UserScope, slug: string, lang: string) =>
  `arena:code:${scope(userId)}:${slug}:${lang}`
export const langStorageKey = (userId: UserScope, slug: string) => `arena:lang:${scope(userId)}:${slug}`
export const progressStorageKey = (userId: UserScope, slug: string, lang: string) =>
  `arena:progress:${scope(userId)}:${slug}:${lang}`
export const playbackSpeedStorageKey = 'arena:playback-speed'

/** Avancement mémorisé d'un défi (par langage). Les replays en sont retirés avant stockage. */
export interface SavedProgress {
  testRuns: Record<number, TestRunResult>
  runSummary: { passed: number; total: number } | null
  submitResult: SubmitResult | null
  playResult: PlayResult | null
}

/* ── Vitesse de lecture ── */

export function loadPlaybackSpeed(): number {
  if (typeof window === 'undefined') return 1
  try {
    const s = window.localStorage.getItem(playbackSpeedStorageKey)
    return s ? Number(s) : 1
  } catch {
    return 1
  }
}

export function savePlaybackSpeed(speed: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(playbackSpeedStorageKey, speed.toString())
  } catch {
    /* ignore */
  }
}

/* ── Code ── */

export function loadSavedCode(userId: UserScope, slug: string, lang: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeStorageKey(userId, slug, lang))
  } catch {
    return null
  }
}

export function saveCode(userId: UserScope, slug: string, lang: string, code: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(codeStorageKey(userId, slug, lang), code)
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}

/* ── Langage choisi ── */

export function loadSavedLang(userId: UserScope, slug: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(langStorageKey(userId, slug))
  } catch {
    return null
  }
}

export function saveLang(userId: UserScope, slug: string, lang: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(langStorageKey(userId, slug), lang)
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}

/* ── Avancement ── */

/** Retire les replays (animations lourdes) d'un jeu de résultats : on garde les verdicts/scores. */
export const stripReplays = (runs: Record<number, TestRunResult>): Record<number, TestRunResult> => {
  const out: Record<number, TestRunResult> = {}
  for (const [k, r] of Object.entries(runs)) out[Number(k)] = { ...r, replay: null }
  return out
}

export function loadProgress(userId: UserScope, slug: string, lang: string): SavedProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(progressStorageKey(userId, slug, lang))
    return raw ? (JSON.parse(raw) as SavedProgress) : null
  } catch {
    return null
  }
}

export function saveProgress(userId: UserScope, slug: string, lang: string, p: SavedProgress) {
  if (typeof window === 'undefined') return
  const isEmpty =
    Object.keys(p.testRuns).length === 0 && !p.runSummary && !p.submitResult && !p.playResult
  try {
    // Rien à mémoriser → on nettoie l'entrée plutôt que d'écrire un objet vide.
    if (isEmpty) {
      window.localStorage.removeItem(progressStorageKey(userId, slug, lang))
      return
    }
    const compact: SavedProgress = {
      testRuns: stripReplays(p.testRuns),
      runSummary: p.runSummary,
      submitResult: p.submitResult,
      playResult: p.playResult
        ? { ...p.playResult, results: p.playResult.results.map((r) => ({ ...r, replay: null })) }
        : null,
    }
    window.localStorage.setItem(progressStorageKey(userId, slug, lang), JSON.stringify(compact))
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}
