import type { GameViewerFactory, Replay } from '@/components/arena/gameViewer'

import { buildMazePreview } from './maze/preview'
import { createMazeViewer } from './maze/viewer'
import { buildPlatformerPreview } from './platformer/preview'
import { createPlatformerViewer } from './platformer/viewer'

/**
 * Module front d'un jeu : tout ce dont l'IDE a besoin pour un slug donné.
 * Ajouter un jeu = écrire son viewer + son parseur d'état initial, puis l'enregistrer ici.
 */
export interface GameModule {
  /** Viewer PixiJS (factory : une instance fraîche par montage du ReplayPlayer). */
  createViewer: GameViewerFactory
  /**
   * Construit l'état de départ (replay figé d'1 frame) à partir de l'input brut
   * d'un cas de test, pour le prévisualiser dans la visualisation sans exécution.
   */
  buildPreview: (input: string) => Replay
}

/** Registre des jeux : slug → module. */
export const GAMES: Record<string, GameModule> = {
  maze:       { createViewer: createMazeViewer,       buildPreview: buildMazePreview },
  platformer: { createViewer: createPlatformerViewer, buildPreview: buildPlatformerPreview },
}
