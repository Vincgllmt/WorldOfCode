import type { Replay } from '@/components/arena/gameViewer'

import type { ColorsFrame, ColorsInit, SkinColor } from './types'

/**
 * Parse un niveau de « Caméléon Gourmand » (même format que le referee) en état initial.
 * Format :
 *   cols rows cible
 *   <nbFruits>
 *   fx fy couleur        (un fruit par ligne)
 *   <nbObstacles>
 *   ox oy                (un obstacle par ligne)
 * Le caméléon démarre en (0,0).
 */
export function parseChameleonColors(input: string): ColorsInit {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '')
  const [cols, rows, target] = (lines[0] ?? '0 0 0').trim().split(/\s+/).map(Number)

  let idx = 1
  const nFruits = Number(lines[idx] ?? 0)
  idx += 1
  const fruits: { pos: [number, number]; color: SkinColor }[] = []
  for (let i = 0; i < nFruits; i++) {
    const p = (lines[idx] ?? '0 0 R').trim().split(/\s+/)
    idx += 1
    fruits.push({ pos: [Number(p[0]), Number(p[1])], color: p[2] as SkinColor })
  }

  const walls: [number, number][] = []
  const nObst = Number(lines[idx] ?? 0)
  idx += 1
  for (let i = 0; i < nObst; i++) {
    const p = (lines[idx] ?? '0 0').trim().split(/\s+/)
    idx += 1
    walls.push([Number(p[0]), Number(p[1])])
  }

  return { cols, rows, walls, start: [0, 0], fruits, target, budget: 0 }
}

/**
 * Replay figé d'une seule frame = état de départ (caméléon en (0,0), peau neutre).
 * Permet d'afficher l'état initial d'un niveau dans la visualisation sans exécution.
 */
export function buildChameleonColorsPreview(input: string): Replay<ColorsInit, ColorsFrame> {
  const init = parseChameleonColors(input)
  return {
    init,
    frames: [
      {
        pos: init.start,
        skin: null,
        event: 'start',
        eaten: null,
        eatenColor: null,
        series: { target: 1, count: 0, color: null, completed: 0 },
        score: 0,
      },
    ],
  }
}
