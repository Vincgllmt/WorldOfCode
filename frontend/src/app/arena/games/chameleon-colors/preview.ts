import type { Replay } from '@/components/arena/gameViewer'

import type { ColorsFrame, ColorsInit, SkinColor } from './types'

/**
 * Parse une grille de « Caméléon Gourmand » (même format que le referee) en état initial.
 * Format : 1re ligne « cols rows budget cible », puis `rows` lignes ;
 * S=départ, #=mur, R/G/B=fruit rouge/vert/bleu.
 */
export function parseChameleonColors(input: string): ColorsInit {
  const lines = input.split(/\r?\n/).filter((l) => l !== '')
  const [cols, rows, budget, target] = (lines[0] ?? '0 0 0 0').trim().split(/\s+/).map(Number)
  const grid = lines.slice(1, 1 + rows)

  const walls: [number, number][] = []
  const fruits: { pos: [number, number]; color: SkinColor }[] = []
  let start: [number, number] = [0, 0]

  for (let y = 0; y < rows; y++) {
    const row = grid[y] ?? ''
    for (let x = 0; x < cols; x++) {
      const c = row[x] ?? '.'
      if (c === '#') walls.push([x, y])
      else if (c === 'S') start = [x, y]
      else if (c === 'R' || c === 'G' || c === 'B') fruits.push({ pos: [x, y], color: c })
    }
  }

  return { cols, rows, walls, start, fruits, target, budget }
}

/**
 * Replay figé d'une seule frame = état de départ (caméléon sur S, peau neutre).
 * Permet d'afficher l'état initial d'un cas dans la visualisation sans exécution.
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
