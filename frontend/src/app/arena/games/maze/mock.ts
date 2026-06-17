import type { Replay } from '@/components/arena/gameViewer'

import type { MazeFrame, MazeInit } from './types'

/**
 * Replay mocké du labyrinthe (en attendant le referee réel côté Piston).
 * Chemin valide de start (0,0) à goal (7,5) qui évite les murs.
 */
export const mazeMock: Replay<MazeInit, MazeFrame> = {
  init: {
    cols: 8,
    rows: 6,
    walls: [
      [3, 2],
      [3, 3],
      [4, 2],
      [2, 4],
      [5, 4],
      [1, 2],
    ],
    start: [0, 0],
    goal: [7, 5],
  },
  frames: [
    { pos: [0, 0] },
    { pos: [1, 0], event: 'move' },
    { pos: [2, 0], event: 'move' },
    { pos: [3, 0], event: 'move' },
    { pos: [4, 0], event: 'move' },
    { pos: [5, 0], event: 'move' },
    { pos: [6, 0], event: 'move' },
    { pos: [7, 0], event: 'move' },
    { pos: [7, 1], event: 'move' },
    { pos: [7, 2], event: 'move' },
    { pos: [7, 3], event: 'move' },
    { pos: [7, 4], event: 'move' },
    { pos: [7, 5], event: 'goal' },
  ],
}
