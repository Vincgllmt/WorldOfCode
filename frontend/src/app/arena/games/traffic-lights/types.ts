export type LightColor = 'VERT' | 'ORANGE' | 'ROUGE'

export interface TrafficInit {
  /** Couleur de chaque feu, dans l'ordre où la voiture les rencontre. */
  lights: string[]
}

export type TrafficEvent =
  | 'start' // voiture au départ
  | 'drive' // feu franchi avec le bon ordre
  | 'wrong' // mauvais ordre (ou ordre inconnu) : infraction
  | 'missing' // plus d'ordre pour ce feu
  | 'extra' // ordres en trop après le dernier feu
  | 'arrived' // destination atteinte

export interface TrafficFrame {
  /** Feu traité par cette frame (-1 au départ, nombre de feux à l'arrivée). */
  light: number
  event: TrafficEvent
  /** Couleur du feu traité. */
  color?: string
  /** Ordre donné par le joueur. */
  order?: string
  /** Ordre attendu (wrong / missing). */
  expected?: string
}
