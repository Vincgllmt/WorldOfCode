import type { Replay } from '@/components/arena/gameViewer'

import type { StaircaseFrame, StaircaseInit } from './types'

/** Parse l'entrée d'un cas : un seul nombre, le nombre de marches. */
export function parseStaircase(input: string): StaircaseInit {
  const n = Math.max(0, Math.floor(Number(input.trim().split(/\s+/)[0]) || 0))
  return { n, lines: [] }
}

/** Replay figé d'une frame : le plan de l'escalier, encore vide. */
export function buildStaircasePreview(input: string): Replay<StaircaseInit, StaircaseFrame> {
  return { init: parseStaircase(input), frames: [{ row: 0, event: 'start' }] }
}
