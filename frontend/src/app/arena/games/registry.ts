import type { GameViewerFactory, Replay } from '@/components/arena/gameViewer'

import { buildCaesarPreview } from './caesar-cipher/preview'
import { createCaesarViewer } from './caesar-cipher/viewer'
import { buildChameleonColorsPreview } from './chameleon-colors/preview'
import { createChameleonColorsViewer } from './chameleon-colors/viewer'
import { buildCountdownPreview } from './countdown/preview'
import { createCountdownViewer } from './countdown/viewer'
import { buildLifePreview } from './game-of-life/preview'
import { createLifeViewer } from './game-of-life/viewer'
import { buildHorseRacePreview } from './horse-race/preview'
import { createHorseRaceViewer } from './horse-race/viewer'
import { buildMarsLanderPreview } from './mars-lander/preview'
import { createMarsLanderViewer } from './mars-lander/viewer'
import { buildMazePreview } from './maze/preview'
import { createMazeViewer } from './maze/viewer'
import { buildParcelSortPreview } from './parcel-sort/preview'
import { createParcelSortViewer } from './parcel-sort/viewer'
import { buildPlatformerPreview } from './platformer/preview'
import { createPlatformerViewer } from './platformer/viewer'
import { buildStaircasePreview } from './staircase/preview'
import { createStaircaseViewer } from './staircase/viewer'
import { buildSudokuPreview } from './sudoku/preview'
import { createSudokuViewer } from './sudoku/viewer'
import { buildTrafficPreview } from './traffic-lights/preview'
import { createTrafficViewer } from './traffic-lights/viewer'
import { buildWalkPreview } from './walk/preview'
import { createWalkViewer } from './walk/viewer'

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
  // Premier jeu : afficher du texte suffit à réussir le 1er cas, une boucle à tous les passer.
  walk: { createViewer: createWalkViewer, buildPreview: buildWalkPreview },
  maze: { createViewer: createMazeViewer, buildPreview: buildMazePreview },
  platformer: { createViewer: createPlatformerViewer, buildPreview: buildPlatformerPreview },
  'mars-lander': { createViewer: createMarsLanderViewer, buildPreview: buildMarsLanderPreview },
  'chameleon-colors': { createViewer: createChameleonColorsViewer, buildPreview: buildChameleonColorsPreview },
  'horse-race': { createViewer: createHorseRaceViewer, buildPreview: buildHorseRacePreview },
  'parcel-sort': { createViewer: createParcelSortViewer, buildPreview: buildParcelSortPreview },
  countdown: { createViewer: createCountdownViewer, buildPreview: buildCountdownPreview },
  'traffic-lights': { createViewer: createTrafficViewer, buildPreview: buildTrafficPreview },
  staircase: { createViewer: createStaircaseViewer, buildPreview: buildStaircasePreview },
  'caesar-cipher': { createViewer: createCaesarViewer, buildPreview: buildCaesarPreview },
  'game-of-life': { createViewer: createLifeViewer, buildPreview: buildLifePreview },
  sudoku: { createViewer: createSudokuViewer, buildPreview: buildSudokuPreview },
}
