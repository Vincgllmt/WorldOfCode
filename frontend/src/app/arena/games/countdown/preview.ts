import type { Replay } from '@/components/arena/gameViewer'

import type { CountdownFrame, CountdownInit } from './types'

/** Parse l'entrée d'un cas (un seul nombre : le départ) en état initial. */
export function parseCountdown(input: string): CountdownInit {
  const n = Math.max(0, Math.floor(Number(input.trim().split(/\s+/)[0]) || 0))
  const sequence: string[] = []
  for (let k = n; k >= 1; k--) sequence.push(String(k))
  sequence.push('FEU')
  return { n, sequence }
}

/** Replay figé d'une frame : la fusée sur son tube, mèche intacte, avant le décompte. */
export function buildCountdownPreview(input: string): Replay<CountdownInit, CountdownFrame> {
  return { init: parseCountdown(input), frames: [{ step: 0, event: 'ready' }] }
}
