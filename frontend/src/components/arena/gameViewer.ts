import type { Application } from 'pixi.js'

/**
 * Trace de replay émise par le referee (côté Piston) et rejouée par le ReplayPlayer.
 * `init` et `frames` sont propres à chaque jeu et interprétés par son viewer.
 */
export interface Replay<Init = unknown, Frame = unknown> {
  init: Init
  frames: Frame[]
}

/**
 * Contrat d'un viewer de jeu : il ne s'occupe QUE du dessin.
 * Le ReplayPlayer générique gère le temps et appelle renderFrame avec
 * `t` (0→1) = progression vers la frame suivante (pour l'interpolation).
 */
export interface GameViewer<Init = unknown, Frame = unknown> {
  setup(app: Application, init: Init): void | Promise<void>
  renderFrame(frame: Frame, t: number, prev: Frame | null): void
  teardown(app: Application): void
}

export type GameViewerFactory = () => GameViewer
