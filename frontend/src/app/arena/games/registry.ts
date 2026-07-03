import type { GameViewerFactory, Replay } from '@/components/arena/gameViewer'

import { buildChameleonColorsPreview } from './chameleon-colors/preview'
import { createChameleonColorsViewer } from './chameleon-colors/viewer'
import { buildHorseRacePreview } from './horse-race/preview'
import { createHorseRaceViewer } from './horse-race/viewer'
import { buildMarsLanderPreview } from './mars-lander/preview'
import { createMarsLanderViewer } from './mars-lander/viewer'
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
  maze: { createViewer: createMazeViewer, buildPreview: buildMazePreview },
  platformer: { createViewer: createPlatformerViewer, buildPreview: buildPlatformerPreview },
  'mars-lander': { createViewer: createMarsLanderViewer, buildPreview: buildMarsLanderPreview },
  'chameleon-colors': { createViewer: createChameleonColorsViewer, buildPreview: buildChameleonColorsPreview },
  'horse-race': { createViewer: createHorseRaceViewer, buildPreview: buildHorseRacePreview },
}
