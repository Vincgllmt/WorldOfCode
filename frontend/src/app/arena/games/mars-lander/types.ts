/** Données de replay Mars Lander (émises par le referee, lues par le viewer). */

export interface MarsLanderInit {
  /** Largeur du monde en mètres (7000). */
  width: number
  /** Hauteur du monde en mètres (3000). */
  height: number
  /** Gravité martienne (3.711 m/s²). */
  gravity: number
  /** Points du sol (x, altitude), reliés séquentiellement. */
  surface: [number, number][]
  /** Zone d'atterrissage plane : segment [x1, x2] à l'altitude y. */
  landing: { x1: number; x2: number; y: number }
}

export type MarsLanderEvent =
  | 'landed' // posé en douceur sur la zone plane
  | 'landed-bad' // touché la zone mais hors limites (vitesse/angle)
  | 'crashed' // percuté un relief
  | 'lost' // sorti de la zone de jeu
  | 'out-of-commands' // plus de commandes avant d'atterrir

export interface MarsLanderFrame {
  /** Numéro du tour (secondes). */
  time: number
  x: number
  y: number
  hSpeed: number
  vSpeed: number
  fuel: number
  rotate: number
  power: number
  event?: MarsLanderEvent
}
