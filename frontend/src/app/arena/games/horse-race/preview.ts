import type { Replay } from '@/components/arena/gameViewer'

import type { HorseRaceFrame, HorseRaceInit } from './types'

/**
 * Parse un cas de course de chevaux en état initial.
 * Format : 1re ligne « distance N », puis N lignes « nom vitesse endurance ».
 */
export function buildHorseRacePreview(input: string): Replay<HorseRaceInit, HorseRaceFrame> {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '')
  const [distance, n] = (lines[0] ?? '100 2').trim().split(/\s+/).map(Number)

  const horses = []
  for (let i = 1; i <= (n ?? 0); i++) {
    const parts = (lines[i] ?? '').trim().split(/\s+/)
    horses.push({
      name:    parts[0] ?? `Cheval${i}`,
      speed:   parseInt(parts[1] ?? '10', 10),
      stamina: parseInt(parts[2] ?? '100', 10),
      rank:    0,
    })
  }

  const init: HorseRaceInit = { distance: distance ?? 100, horses }
  const frame: HorseRaceFrame = {
    positions: horses.map(() => 0),
    staminas:  horses.map((h) => h.stamina),
    finished:  [],
  }

  return { init, frames: [frame] }
}
