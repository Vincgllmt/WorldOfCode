export type SkinColor = 'R' | 'G' | 'B'

export interface ColorsFruit {
  pos: [number, number]
  color: SkinColor
}

export interface ColorsInit {
  cols: number
  rows: number
  walls: [number, number][]
  start: [number, number]
  fruits: ColorsFruit[]
  target: number
  budget: number
}

/** État du combo croissant au tour courant. */
export interface ColorsSeries {
  target: number // taille de la série en cours de constitution (1, 2, 3…)
  count: number // fruits déjà mangés dans cette série
  color: SkinColor | null // couleur fixée par le 1er fruit de la série
  completed: number // séries entièrement complétées
}

export interface ColorsFrame {
  pos: [number, number]
  skin: SkinColor | null
  event: 'start' | 'move' | 'skin' | 'eat' | 'blocked'
  eaten: [number, number] | null
  eatenColor: SkinColor | null
  series: ColorsSeries
  score: number
}
