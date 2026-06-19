export interface MazeInit {
  cols: number
  rows: number
  walls: [number, number][]
  start: [number, number]
  goal: [number, number]
}

export interface MazeFrame {
  pos: [number, number]
  event?: 'move' | 'hit-wall' | 'goal'
}
