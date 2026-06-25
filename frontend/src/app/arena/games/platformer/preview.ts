import type { Replay } from '@/components/arena/gameViewer'

import type { GauntletFrame, GauntletInit } from './types'

export function parseGauntlet(input: string): GauntletInit {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '')
  return {
    problemType: lines[0]?.trim() ?? '',
    inputData:   lines[1]?.trim() ?? '',
    obstacleX:   0.5,
  }
}

export function buildPlatformerPreview(input: string): Replay<GauntletInit, GauntletFrame> {
  const init = parseGauntlet(input)
  return { init, frames: [{ cameleonX: 0.05, cameleonY: 0.0, event: 'walk' }] }
}
