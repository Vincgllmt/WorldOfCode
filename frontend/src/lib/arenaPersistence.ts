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

export const codeStorageKey = (slug: string, lang: string) => `arena:code:${slug}:${lang}`
export const langStorageKey = (slug: string) => `arena:lang:${slug}`
export const progressStorageKey = (slug: string, lang: string) => `arena:progress:${slug}:${lang}`

/** Avancement mémorisé d'un défi (par langage). Les replays en sont retirés avant stockage. */
export interface SavedProgress {
  testRuns: Record<number, TestRunResult>
  runSummary: { passed: number; total: number } | null
  submitResult: SubmitResult | null
  playResult: PlayResult | null
}

/* ── Code ── */

export function loadSavedCode(slug: string, lang: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeStorageKey(slug, lang))
  } catch {
    return null
  }
}

export function saveCode(slug: string, lang: string, code: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(codeStorageKey(slug, lang), code)
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}

/* ── Langage choisi ── */

export function loadSavedLang(slug: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(langStorageKey(slug))
  } catch {
    return null
  }
}

export function saveLang(slug: string, lang: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(langStorageKey(slug), lang)
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

export function loadProgress(slug: string, lang: string): SavedProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(progressStorageKey(slug, lang))
    return raw ? (JSON.parse(raw) as SavedProgress) : null
  } catch {
    return null
  }
}

export function saveProgress(slug: string, lang: string, p: SavedProgress) {
  if (typeof window === 'undefined') return
  const isEmpty =
    Object.keys(p.testRuns).length === 0 && !p.runSummary && !p.submitResult && !p.playResult
  try {
    // Rien à mémoriser → on nettoie l'entrée plutôt que d'écrire un objet vide.
    if (isEmpty) {
      window.localStorage.removeItem(progressStorageKey(slug, lang))
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
    window.localStorage.setItem(progressStorageKey(slug, lang), JSON.stringify(compact))
  } catch {
    /* quota dépassé / navigation privée : on ignore silencieusement */
  }
}
