import type { Replay } from '@/components/arena/gameViewer'

import type { WalkFrame, WalkInit } from './types'

/**
 * Parse l'entrée d'une promenade (même format que le referee) : une seule ligne,
 * un seul nombre — la distance jusqu'à la fraise.
 */
export function parseWalk(input: string): WalkInit {
  const distance = Math.max(0, Number.parseInt(input.trim().split(/\s+/)[0] ?? '', 10) || 0)

  return { distance }
}

/**
 * Replay figé d'une seule frame = état de départ (caméléon au début de la branche).
 * Permet d'afficher la promenade sans exécuter de code.
 */
export function buildWalkPreview(input: string): Replay<WalkInit, WalkFrame> {
  return { init: parseWalk(input), frames: [{ pos: 0 }] }
}
