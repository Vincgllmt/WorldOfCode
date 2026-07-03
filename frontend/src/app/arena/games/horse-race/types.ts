export interface HorseInfo {
  name: string
  speed: number
  stamina: number
  rank: number
}

export interface HorseRaceInit {
  distance: number
  horses: HorseInfo[]
}

export interface HorseRaceFrame {
  positions: number[]
  staminas: number[]
  finished: string[]
}
