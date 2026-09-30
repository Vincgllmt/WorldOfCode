import type { Replay } from '@/components/arena/gameViewer'

import type { LifeFrame, LifeInit } from './types'

/** Parse l'entrée d'un cas : « largeur hauteur générations » puis la grille. */
export function parseLife(input: string): { init: LifeInit; alive: number[] } {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '')
  const [cols, rows, gens] = (lines[0] ?? '0 0 0').trim().split(/\s+/).map(Number)
  const alive: number[] = []
  for (let y = 0; y < rows; y++) {
    const row = (lines[1 + y] ?? '').trim()
    for (let x = 0; x < cols; x++) if (row[x] === '#') alive.push(y * cols + x)
  }
  return { init: { cols, rows, gens }, alive }
}

/** Replay figé d'une frame : la culture de départ (génération 0). */
export function buildLifePreview(input: string): Replay<LifeInit, LifeFrame> {
  const { init, alive } = parseLife(input)
  return { init, frames: [{ event: 'gen', gen: 0, alive }] }
}
