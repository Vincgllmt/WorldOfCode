import type { Replay } from '@/components/arena/gameViewer'

import type { MazeFrame, MazeInit } from './types'

/**
 * Parse une grille de labyrinthe (même format que le referee) en état initial.
 * Format : 1re ligne « cols rows », puis `rows` lignes ; S=départ, G=sortie, #=mur.
 */
export function parseMaze(input: string): MazeInit {
  const lines = input.split(/\r?\n/).filter((l) => l !== '')
  const [cols, rows] = (lines[0] ?? '0 0').trim().split(/\s+/).map(Number)
  const grid = lines.slice(1, 1 + rows)

  const walls: [number, number][] = []
  let start: [number, number] = [0, 0]
  let goal: [number, number] = [0, 0]

  for (let y = 0; y < rows; y++) {
    const row = grid[y] ?? ''
    for (let x = 0; x < cols; x++) {
      const c = row[x] ?? '.'
      if (c === '#') walls.push([x, y])
      else if (c === 'S') start = [x, y]
      else if (c === 'G') goal = [x, y]
    }
  }

  return { cols, rows, walls, start, goal }
}

/**
 * Replay figé d'une seule frame = état de départ d'un cas (token sur la case S).
 * Permet d'afficher l'état initial dans la visualisation sans exécuter de code.
 */
export function buildMazePreview(input: string): Replay<MazeInit, MazeFrame> {
  const init = parseMaze(input)
  return { init, frames: [{ pos: init.start }] }
}
