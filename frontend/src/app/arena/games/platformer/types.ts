export interface GauntletBlock {
  problemType: string
  x:           number
  cleared:     boolean
}

export interface GauntletInit {
  problemType:   string
  inputData:     string
  obstacleX:     number
  blocks?:       GauntletBlock[]
  currentBlock?: number
}

export interface GauntletFrame {
  cameleonX: number
  cameleonY: number
  event?: 'walk' | 'jump' | 'land' | 'hit' | 'fall' | 'dead' | 'goal'
}
