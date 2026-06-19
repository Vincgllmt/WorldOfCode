import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { ColorsFrame, ColorsInit, SkinColor } from './types'

const FRUIT_EMOJI: Record<SkinColor, string> = { R: '🍓', G: '🍏', B: '🫐' }
// Images optionnelles : déposer fruit-r.png / fruit-g.png / fruit-b.png
// dans frontend/public/games/chameleon-colors/. Sinon, on retombe sur les emojis.
const FRUIT_PNG: Record<SkinColor, string> = {
  R: '/games/chameleon-colors/fruit-r.png',
  G: '/games/chameleon-colors/fruit-g.png',
  B: '/games/chameleon-colors/fruit-b.png',
}
// Images d'obstacles optionnelles (buisson / arbre) ; sinon buisson dessiné en vectoriel.
const BUSH_PNG = '/games/chameleon-colors/buisson.png'
const TREE_PNG = '/games/chameleon-colors/arbre.png'
// Arbres / décors spécifiques à certains biomes (déposés dans le même dossier public).
const TREE_AUTUMN_PNG = '/games/chameleon-colors/arbre-automne.png'
const TREE_WINTER_PNG = '/games/chameleon-colors/arbre-hiver.png'
const TREE_DEAD_PNG = '/games/chameleon-colors/arbre-mort.png'
const TREE_ROSE_PNG = '/games/chameleon-colors/arbre-rose.png'
const ROCK_SAND_PNG = '/games/chameleon-colors/rocks-sand.png'
const VOLCAN_PNG = '/games/chameleon-colors/volcan.png'
const CHARBON_PNG = '/games/chameleon-colors/charbon.png'
const FLOWER_PNG = '/games/chameleon-colors/fleur.png'
const FISH_PNG = '/games/chameleon-colors/fish.png'
const SHELL_PNG = '/games/chameleon-colors/coquillage.png'
const COLOR_NAME: Record<SkinColor, string> = { R: 'Rouge', G: 'Vert', B: 'Bleu' }
const CONFETTI = [0xf85149, 0x3fb950, 0x58a6ff, 0xf0d000, 0xffffff, 0xd2a8ff]

// Spritesheets caméléon (4×4, frames 128×128), un par couleur de peau.
const CHAM_SHEET: Record<SkinColor, string> = {
  R: '/games/chameleon-colors/cameleon-r.png',
  G: '/games/chameleon-colors/cameleon-v.png',
  B: '/games/chameleon-colors/cameleon-b.png',
}
const NEUTRAL_SHEET = '/games/chameleon-colors/cameleon-v.png' // vert au départ
const FRAME = 128
const WALK_ROW = 0
const WALK_FRAMES = 4

interface Confetti {
  g: Graphics
  vx: number
  vy: number
  vr: number
}

/** PRNG déterministe (mulberry32) : un décor stable d'un rendu à l'autre. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Interpolation linéaire entre deux couleurs 0xRRGGBB. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

/** Touffe d'herbe (4 brins courbés) à la position (x, y), base au sol. */
function makeTuft(x: number, y: number, s: number, color: number): Graphics {
  const g = new Graphics()
  for (const off of [-0.55, -0.18, 0.18, 0.55]) {
    const bx = x + off * s
    g.moveTo(bx - s * 0.07, y)
    g.quadraticCurveTo(bx + off * s * 0.5, y - s * 0.78, bx + off * s * 0.55, y - s)
    g.quadraticCurveTo(bx + off * s * 0.5, y - s * 0.7, bx + s * 0.07, y)
    g.fill(color)
  }
  return g
}

/** Petite fleur à 5 pétales avec cœur. */
function makeFlower(x: number, y: number, s: number, petal: number, heart: number): Graphics {
  const g = new Graphics()
  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2
    g.circle(x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, s * 0.34).fill(petal)
  }
  g.circle(x, y, s * 0.36).fill(heart)
  return g
}

/** Contexte de dessin fourni à chaque peintre de biome. */
interface BiomeCtx {
  meadow: Container
  ox: number
  oy: number
  boardW: number
  boardH: number
  cell: number
  cols: number
  rows: number
  rng: () => number
  occupied: Set<string>
}

/** Dégradé vertical (haut → bas) via bandes empilées. */
function paintGradient(c: BiomeCtx, top: number, bot: number) {
  const STRIPS = 24
  for (let i = 0; i < STRIPS; i++) {
    c.meadow.addChild(
      new Graphics().rect(c.ox, c.oy + (c.boardH * i) / STRIPS, c.boardW, c.boardH / STRIPS + 1).fill(lerpColor(top, bot, i / (STRIPS - 1))),
    )
  }
}

/** Halo lumineux (approximé par 3 cercles d'alpha décroissant). */
function addGlow(c: BiomeCtx, x: number, y: number, r: number, color: number, alpha: number) {
  const g = new Graphics()
  g.circle(x, y, r).fill({ color, alpha: alpha * 0.22 })
  g.circle(x, y, r * 0.6).fill({ color, alpha: alpha * 0.4 })
  g.circle(x, y, r * 0.3).fill({ color, alpha })
  c.meadow.addChild(g)
}

// --- Peintres de biome : chacun remplit `meadow` (masqué à la forme du plateau). ---

function paintPrairie(c: BiomeCtx) {
  paintGradient(c, 0x57a85d, 0x235a30)
  const r = c.rng
  for (let i = 0; i < 12; i++) {
    const px = c.ox + r() * c.boardW, py = c.oy + r() * c.boardH, rr = c.cell * (0.5 + r() * 1)
    c.meadow.addChild(new Graphics().ellipse(px, py, rr, rr * 0.6).fill({ color: r() < 0.5 ? 0x66b56a : 0x2b6c37, alpha: 0.16 }))
  }
  const tcols = [0x3f8a47, 0x57b35e, 0x2f7a3a]
  const pal: ReadonlyArray<readonly [number, number]> = [[0xffffff, 0xf7c948], [0xf7a8c4, 0xfff3b0], [0xc9a8ff, 0xfff3b0], [0xffd166, 0xffffff]]
  for (let gy = 0; gy < c.rows; gy++) {
    for (let gx = 0; gx < c.cols; gx++) {
      if (c.occupied.has(`${gx},${gy}`)) continue
      const bx = c.ox + gx * c.cell, by = c.oy + gy * c.cell
      for (let k = 0; k < 1 + Math.floor(r() * 2); k++) {
        c.meadow.addChild(makeTuft(bx + r() * c.cell, by + (0.35 + r() * 0.6) * c.cell, c.cell * (0.18 + r() * 0.16), tcols[Math.floor(r() * 3)]))
      }
      if (r() < 0.4) {
        const [petal, heart] = pal[Math.floor(r() * 4)]
        c.meadow.addChild(makeFlower(bx + r() * c.cell, by + (0.2 + r() * 0.6) * c.cell, c.cell * (0.1 + r() * 0.06), petal, heart))
      }
    }
  }
}

function paintBanquise(c: BiomeCtx) {
  paintGradient(c, 0xdff0f5, 0x9cc7d6)
  const r = c.rng
  for (let i = 0; i < 8; i++) {
    c.meadow.addChild(new Graphics().ellipse(c.ox + r() * c.boardW, c.oy + r() * c.boardH, 8 + r() * 16, 5 + r() * 8).fill({ color: 0x78aac8, alpha: 0.22 }))
  }
  for (let i = 0; i < 14; i++) {
    const px = c.ox + r() * c.boardW, py = c.oy + r() * c.boardH
    c.meadow.addChild(new Graphics().moveTo(px, py).lineTo(px + (r() - 0.5) * 40, py + (r() - 0.5) * 40).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 }))
  }
}

function paintSavane(c: BiomeCtx) {
  paintGradient(c, 0xcdb15a, 0x9c8a3e)
  const r = c.rng
  const tc = [0xb8a14a, 0xcaa84e, 0x9c8638]
  for (let i = 0; i < 80; i++) {
    c.meadow.addChild(makeTuft(c.ox + r() * c.boardW, c.oy + r() * c.boardH, c.cell * (0.2 + r() * 0.22), tc[Math.floor(r() * 3)]))
  }
}

function paintVolcan(c: BiomeCtx) {
  paintGradient(c, 0x2a2326, 0x161214)
  const r = c.rng
  for (let i = 0; i < 9; i++) {
    const px = c.ox + r() * c.boardW, py = c.oy + r() * c.boardH
    const ex = px + (r() - 0.5) * 60, ey = py + (r() - 0.5) * 40
    c.meadow.addChild(new Graphics().moveTo(px, py).lineTo(ex, ey).stroke({ color: 0xff6e14, width: 4, alpha: 0.25 }))
    c.meadow.addChild(new Graphics().moveTo(px, py).lineTo(ex, ey).stroke({ color: 0xffae28, width: 1.5, alpha: 0.9 }))
  }
  for (let i = 0; i < 26; i++) addGlow(c, c.ox + r() * c.boardW, c.oy + r() * c.boardH, 3 + r() * 3, 0xffaa28, 0.8)
}

function paintLagon(c: BiomeCtx) {
  const STRIPS = 24, split = 0.52
  for (let i = 0; i < STRIPS; i++) {
    const f = i / (STRIPS - 1)
    const col = f < split ? lerpColor(0x33b5c4, 0x7fd6df, f / split) : lerpColor(0xecd9a8, 0xd8bd84, (f - split) / (1 - split))
    c.meadow.addChild(new Graphics().rect(c.ox, c.oy + (c.boardH * i) / STRIPS, c.boardW, c.boardH / STRIPS + 1).fill(col))
  }
  const r = c.rng
  for (let i = 0; i < 26; i++) {
    c.meadow.addChild(new Graphics().circle(c.ox + r() * c.boardW, c.oy + r() * c.boardH * split, 1 + r() * 2).fill({ color: 0xffffff, alpha: 0.5 }))
  }
}

function paintAutomne(c: BiomeCtx) {
  paintGradient(c, 0x8a8a3a, 0x5c6b2e)
  const r = c.rng
  const lv = [0xc1440e, 0xe09f3e, 0x9e2a2b, 0xbb8a3c]
  for (let i = 0; i < 70; i++) {
    const s = 2 + r() * 3
    const leaf = new Graphics().ellipse(0, 0, s, s * 0.5).fill(lv[Math.floor(r() * 4)])
    leaf.position.set(c.ox + r() * c.boardW, c.oy + r() * c.boardH)
    leaf.rotation = r() * Math.PI * 2
    c.meadow.addChild(leaf)
  }
}

function paintEnchantee(c: BiomeCtx) {
  paintGradient(c, 0x241a33, 0x10202a)
  const r = c.rng
  for (let i = 0; i < 14; i++) {
    const px = c.ox + r() * c.boardW, py = c.oy + r() * c.boardH
    addGlow(c, px, py - 6, 14, 0x78ffdc, 0.4)
    c.meadow.addChild(new Graphics().ellipse(px, py - 6, 6, 4).fill(0xff6b8b))
    c.meadow.addChild(new Graphics().rect(px - 1.5, py - 6, 3, 7).fill(0xffe0e8))
  }
  for (let i = 0; i < 30; i++) addGlow(c, c.ox + r() * c.boardW, c.oy + r() * c.boardH, 2, 0xb4fff0, 0.9)
}

function paintCanyon(c: BiomeCtx) {
  const cols = [0xa8432a, 0xc9663b, 0xb8542f, 0xd98c4a, 0x9c3d28]
  for (let i = 0; i < 5; i++) {
    c.meadow.addChild(new Graphics().rect(c.ox, c.oy + (c.boardH * i) / 5, c.boardW, c.boardH / 5 + 1).fill(cols[i]))
  }
  for (let i = 1; i < 5; i++) {
    const y = c.oy + (c.boardH * i) / 5
    c.meadow.addChild(new Graphics().moveTo(c.ox, y).lineTo(c.ox + c.boardW, y).stroke({ color: 0x3c140a, width: 1.5, alpha: 0.3 }))
  }
}

/** Décor non bloquant : PNG posé `count` fois sur des cases vides. */
interface BiomeDecor {
  png: string
  count: number
  zone?: 'top' | 'bottom' // restreint à la moitié haute (eau) ou basse (sable) du plateau
  scale?: number // hauteur du sprite en fraction de case (défaut 0.6)
}

/**
 * Biomes en rotation, dans l'ordre de progression des niveaux (doux → spectaculaire).
 * `obstacles` = PNG utilisés pour les murs de ce biome (en alternance) ; défaut buisson/arbre ; `[]` = aucun mur dessiné.
 * `obstacleScale` = hauteur du mur en fraction de case (défaut 0.92). `obstacleShadow` = ombre au sol (défaut true).
 * `decor` = éléments décoratifs non bloquants.
 */
const BIOMES: ReadonlyArray<{ name: string; paint: (c: BiomeCtx) => void; obstacles?: string[]; obstacleScale?: number; obstacleShadow?: boolean; decor?: BiomeDecor[] }> = [
  { name: 'Prairie d’été', paint: paintPrairie, decor: [{ png: FLOWER_PNG, count: 3 }] },
  { name: 'Lagon', paint: paintLagon, obstacles: [], decor: [{ png: FISH_PNG, count: 3, zone: 'top' }, { png: SHELL_PNG, count: 4, zone: 'bottom', scale: 0.45 }] },
  { name: 'Automne', paint: paintAutomne, obstacles: [TREE_AUTUMN_PNG] },
  { name: 'Savane', paint: paintSavane, obstacles: [TREE_DEAD_PNG] },
  { name: 'Banquise', paint: paintBanquise, obstacles: [TREE_WINTER_PNG] },
  { name: 'Forêt enchantée', paint: paintEnchantee, obstacles: [TREE_ROSE_PNG] },
  { name: 'Volcan', paint: paintVolcan, obstacles: [CHARBON_PNG], decor: [{ png: VOLCAN_PNG, count: 2, scale: 1.3 }] },
  { name: 'Canyon', paint: paintCanyon, obstacles: [ROCK_SAND_PNG], obstacleScale: 1.7, obstacleShadow: false },
]

/** Surfaces (cols×rows) des niveaux 1→8 : sert de rang de niveau (toutes distinctes). */
const LEVEL_AREAS = [18, 24, 28, 40, 45, 54, 60, 77]

/**
 * Choix du biome : le rang du niveau (déduit de sa surface) donne un biome fixe et
 * un ordre maîtrisé. Repli sur un hash stable si la taille n'est pas reconnue.
 */
function pickBiome(init: ColorsInit): number {
  const ord = LEVEL_AREAS.indexOf(init.cols * init.rows)
  if (ord >= 0) return ord % BIOMES.length
  let h = (init.cols * 73856093) ^ (init.rows * 19349663) ^ (init.target * 83492791) ^ (init.fruits.length * 2654435) ^ (init.walls.length * 40503)
  init.fruits.forEach((f, i) => { h ^= f.pos[0] * 131 + f.pos[1] * 977 + i })
  init.walls.forEach((w, i) => { h ^= w[0] * 31 + w[1] * 17 + i * 7 })
  return (h >>> 0) % BIOMES.length
}

/**
 * Viewer PixiJS de « Caméléon Gourmand ».
 * Grille + token animé du Labyrinthe, fruits colorés, teinte de peau,
 * bandeau combo/score, et une animation de réussite (confettis + bannière)
 * quand toutes les séries sont complétées.
 */
export function createChameleonColorsViewer(): GameViewer<ColorsInit, ColorsFrame> {
  let appRef: Application | null = null
  let board: Container | null = null
  let token: AnimatedSprite | null = null
  let walkNeutral: Texture[] = []
  let walkByColor: Record<SkinColor, Texture[]> = { R: [], G: [], B: [] }
  let curSkin: SkinColor | null | undefined = undefined
  let hud: Text | null = null
  let confetti: Confetti[] = []
  const fruitGfx = new Map<string, Container>()

  let target = 0
  let cell = 0
  let ox = 0
  let oy = 0
  let screenW = 0
  let screenH = 0
  let tokenBaseScale = 1

  let celebrating = false
  let celebrated = false
  let celebT = 0
  let celebrateTick: ((ticker: Ticker) => void) | null = null

  const center = (x: number, y: number) => ({
    x: ox + x * cell + cell / 2,
    y: oy + y * cell + cell / 2,
  })

  const updateHud = (frame: ColorsFrame) => {
    if (!hud) return
    const s = frame.series
    const inProgress = s.color ? `${s.count}/${s.target} ${COLOR_NAME[s.color]}` : `0/${s.target}`
    hud.text = `Séries ✓ ${s.completed}/${target}     Score ${frame.score}\nSérie en cours : ${inProgress}`
  }

  const startCelebration = () => {
    celebrating = true
    celebT = 0
    confetti.forEach((p) => {
      p.g.visible = true
      p.g.x = Math.random() * screenW
      p.g.y = Math.random() * screenH - screenH
    })
  }

  const stopCelebration = () => {
    celebrating = false
    celebrated = false
    celebT = 0
    confetti.forEach((p) => (p.g.visible = false))
    if (token) token.scale.set(tokenBaseScale)
  }

  return {
    async setup(app: Application, init: ColorsInit) {
      appRef = app
      board = new Container()
      app.stage.addChild(board)
      target = init.target

      const pad = 16
      const w = app.screen.width
      const h = app.screen.height
      screenW = w
      screenH = h
      cell = Math.floor(Math.min((w - 2 * pad) / init.cols, (h - 2 * pad) / init.rows))
      ox = (w - cell * init.cols) / 2
      oy = (h - cell * init.rows) / 2 + 14 // place pour le bandeau

      // Rendu « nature » : pas de grille visible, une prairie fleurie 2D (la logique reste en cases).
      const boardW = init.cols * cell
      const boardH = init.rows * cell
      // Aplat de repli (recouvert par le dégradé ci-dessous).
      board.addChild(new Graphics().roundRect(ox, oy, boardW, boardH, 14).fill(0x2e6b3c))

      // --- Biome du niveau : décor masqué par la forme arrondie du plateau. ---
      const rng = makeRng(init.cols * 131 + init.rows * 17 + init.fruits.length * 7 + 1)
      const occupied = new Set<string>()
      init.walls.forEach(([x, y]) => occupied.add(`${x},${y}`))
      init.fruits.forEach((f) => occupied.add(`${f.pos[0]},${f.pos[1]}`))
      occupied.add(`${init.start[0]},${init.start[1]}`)

      const meadow = new Container()
      board.addChild(meadow)
      const meadowMask = new Graphics().roundRect(ox, oy, boardW, boardH, 14).fill(0xffffff)
      board.addChild(meadowMask)
      meadow.mask = meadowMask

      // Biome fixe par niveau (seed stable dérivé de la disposition).
      const biome = BIOMES[pickBiome(init)]
      biome.paint({ meadow, ox, oy, boardW, boardH, cell, cols: init.cols, rows: init.rows, rng, occupied })

      // Décor PNG non bloquant du biome (fleurs, poissons, coquillages, volcans…) : cases vides distinctes.
      for (const decor of biome.decor ?? []) {
        try {
          const decorTex = await Assets.load<Texture>(decor.png)
          const cells: [number, number][] = []
          for (let gy = 0; gy < init.rows; gy++) {
            for (let gx = 0; gx < init.cols; gx++) {
              if (occupied.has(`${gx},${gy}`)) continue
              const cf = (gy + 0.5) / init.rows // fraction verticale du centre de la case
              if (decor.zone === 'top' && cf >= 0.52) continue
              if (decor.zone === 'bottom' && cf < 0.52) continue
              cells.push([gx, gy])
            }
          }
          for (let i = 0; i < decor.count && cells.length > 0; i++) {
            const [gx, gy] = cells.splice(Math.floor(rng() * cells.length), 1)[0]
            occupied.add(`${gx},${gy}`) // évite que deux décors se superposent
            const c = center(gx, gy)
            const sprite = new Sprite(decorTex)
            sprite.anchor.set(0.5, 1) // posé par la base
            const hsize = cell * (decor.scale ?? 0.6)
            sprite.height = hsize
            sprite.width = hsize * (decorTex.width / decorTex.height)
            sprite.position.set(c.x, c.y + cell * 0.34)
            board.addChild(sprite)
          }
        } catch {
          /* png absent -> ignoré */
        }
      }

      // Obstacles en image : PNG propres au biome si définis, sinon buisson / arbre ; `[]` = aucun mur dessiné.
      const obstacleUrls = biome.obstacles ?? [BUSH_PNG, TREE_PNG]
      const obstacleTex: Texture[] = []
      for (const url of obstacleUrls) {
        try {
          obstacleTex.push(await Assets.load<Texture>(url))
        } catch {
          /* image absente -> ignorée */
        }
      }

      // Murs → obstacles (PNG du biome en alternance, ou buisson vectoriel en repli ; rien si `obstacles: []`).
      for (let wi = 0; obstacleUrls.length > 0 && wi < init.walls.length; wi++) {
        const [wx, wy] = init.walls[wi]
        const c = center(wx, wy)
        if (obstacleTex.length) {
          const tex = obstacleTex[wi % obstacleTex.length]
          // ombre au sol (pour « poser » l'obstacle), sauf si le biome la désactive
          if (biome.obstacleShadow !== false) {
            board.addChild(new Graphics().ellipse(c.x, c.y + cell * 0.34, cell * 0.24, cell * 0.07).fill({ color: 0x123018, alpha: 0.32 }))
          }
          const sprite = new Sprite(tex)
          sprite.anchor.set(0.5, 1) // posé par la base
          const hsize = cell * (biome.obstacleScale ?? 0.92)
          sprite.height = hsize
          sprite.width = hsize * (tex.width / tex.height) // ratio conservé
          sprite.position.set(c.x, c.y + cell * 0.38)
          board.addChild(sprite)
          continue
        }
        const bush = new Graphics()
        // ombre portée au sol
        bush.ellipse(c.x, c.y + cell * 0.17, cell * 0.2, cell * 0.06).fill({ color: 0x143018, alpha: 0.4 })
        // masse du buisson (lobes vert foncé)
        for (const [dx, dy, r] of [[-0.13, 0.05, 0.14], [0.13, 0.05, 0.14], [0, -0.05, 0.16], [-0.06, -0.02, 0.12], [0.07, -0.01, 0.12]] as const) {
          bush.circle(c.x + dx * cell, c.y + dy * cell, r * cell).fill(0x1a4a28)
        }
        // reflets clairs
        for (const [dx, dy, r] of [[-0.07, -0.06, 0.055], [0.05, -0.07, 0.045], [-0.01, 0, 0.05]] as const) {
          bush.circle(c.x + dx * cell, c.y + dy * cell, r * cell).fill({ color: 0x6fcf7a, alpha: 0.55 })
        }
        board.addChild(bush)
      }

      // Point de départ (discret).
      const s = center(init.start[0], init.start[1])
      board.addChild(new Graphics().circle(s.x, s.y, cell * 0.22).fill({ color: 0xffffff, alpha: 0.16 }))

      // Précharge les images de fruits (si présentes), sinon on utilisera les emojis.
      const fruitTex: Partial<Record<SkinColor, Texture>> = {}
      await Promise.all(
        (['R', 'G', 'B'] as SkinColor[]).map(async (col) => {
          try {
            fruitTex[col] = await Assets.load<Texture>(FRUIT_PNG[col])
          } catch {
            /* pas d'image -> emoji */
          }
        }),
      )

      // Fruits : image (ou emoji) + leur NUMÉRO affiché (= le numéro à utiliser dans EAT).
      init.fruits.forEach((fruit, idx) => {
        const c = center(fruit.pos[0], fruit.pos[1])
        const cont = new Container()

        // Ombre portée au sol (sous le fruit).
        cont.addChild(new Graphics().ellipse(0, cell * 0.3, cell * 0.22, cell * 0.07).fill({ color: 0x0a160f, alpha: 0.25 }))

        const tex = fruitTex[fruit.color]
        if (tex) {
          const sprite = new Sprite(tex)
          sprite.anchor.set(0.5)
          sprite.width = cell * 0.7
          sprite.height = cell * 0.7
          cont.addChild(sprite)
        } else {
          const t = new Text({ text: FRUIT_EMOJI[fruit.color], style: { fontSize: Math.round(cell * 0.6) } })
          t.anchor.set(0.5)
          cont.addChild(t)
        }

        // Numéro du fruit, au-dessus, bien lisible (contour sombre).
        const label = new Text({
          text: String(idx),
          style: {
            fill: 0xffffff,
            fontSize: Math.max(11, Math.round(cell * 0.26)),
            fontFamily: 'monospace',
            fontWeight: 'bold',
            stroke: { color: 0x0a160f, width: 3 },
          },
        })
        label.anchor.set(0.5)
        label.position.set(0, -cell * 0.36)
        cont.addChild(label)

        cont.position.set(c.x, c.y)
        board.addChild(cont)
        fruitGfx.set(`${fruit.pos[0]},${fruit.pos[1]}`, cont)
      })

      // Caméléon : un spritesheet par couleur de peau (rouge / vert / bleu).
      const buildWalk = (sheet: Texture) => {
        const frames: Texture[] = []
        for (let c = 0; c < WALK_FRAMES; c++) {
          frames.push(new Texture({ source: sheet.source, frame: new Rectangle(c * FRAME, WALK_ROW * FRAME, FRAME, FRAME) }))
        }
        return frames
      }
      const [sheetV, sheetR, sheetB] = await Promise.all([
        Assets.load<Texture>(NEUTRAL_SHEET),
        Assets.load<Texture>(CHAM_SHEET.R),
        Assets.load<Texture>(CHAM_SHEET.B),
      ])
      walkNeutral = buildWalk(sheetV)
      walkByColor = { R: buildWalk(sheetR), G: walkNeutral, B: buildWalk(sheetB) }

      token = new AnimatedSprite(walkNeutral)
      token.anchor.set(0.5)
      token.animationSpeed = 0.12
      token.play()
      token.width = cell * 0.82
      token.height = cell * 0.82
      tokenBaseScale = token.scale.x
      board.addChild(token)
      token.position.set(s.x, s.y)
      curSkin = undefined

      // Bandeau combo + score.
      hud = new Text({
        text: '',
        style: { fill: 0xe6edf3, fontSize: 13, fontFamily: 'monospace', lineHeight: 17 },
      })
      hud.position.set(ox, 6)
      board.addChild(hud)

      // Confettis (cachés tant qu'on n'a pas gagné).
      confetti = []
      for (let i = 0; i < 60; i++) {
        const g = new Graphics()
        g.rect(-3, -5, 6, 10).fill(CONFETTI[Math.floor(Math.random() * CONFETTI.length)])
        g.rotation = Math.random() * Math.PI
        g.visible = false
        board.addChild(g)
        confetti.push({ g, vx: (Math.random() - 0.5) * 0.6, vy: 1.6 + Math.random() * 2.2, vr: (Math.random() - 0.5) * 0.2 })
      }

      // Boucle d'animation de la célébration (confettis, indépendante du replay).
      celebrateTick = (ticker: Ticker) => {
        if (!celebrating || !token) return
        const dt = ticker.deltaMS
        celebT += dt
        token.scale.set(tokenBaseScale * (1 + 0.08 * Math.sin(celebT / 110)))
        for (const p of confetti) {
          p.g.x += p.vx * dt * 0.06
          p.g.y += p.vy * dt * 0.06
          p.g.rotation += p.vr * dt * 0.06
          if (p.g.y > screenH + 12) {
            p.g.y = -12
            p.g.x = Math.random() * screenW
          }
        }
      }
      app.ticker.add(celebrateTick)
    },

    renderFrame(frame: ColorsFrame, t: number, prev: ColorsFrame | null) {
      if (!token) return

      // Réinitialise tout au redémarrage du replay.
      if (frame.event === 'start') {
        fruitGfx.forEach((g) => (g.visible = true))
        stopCelebration()
      }

      // Position interpolée.
      const from = prev ? prev.pos : frame.pos
      const a = center(from[0], from[1])
      const b = center(frame.pos[0], frame.pos[1])
      token.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx !== 0 || dy !== 0) token.rotation = Math.atan2(dy, dx) - Math.PI / 2

      // Couleur de peau : on échange le spritesheet (rouge/vert/bleu, sinon vert neutre).
      if (frame.skin !== curSkin) {
        token.textures = frame.skin ? walkByColor[frame.skin] : walkNeutral
        token.play()
        curSkin = frame.skin
      }

      // Le fruit mangé disparaît.
      if (frame.eaten) {
        const g = fruitGfx.get(`${frame.eaten[0]},${frame.eaten[1]}`)
        if (g) g.visible = false
      }

      // Déclenche la fête dès que la cible de séries est atteinte.
      if (!celebrated && target > 0 && frame.series.completed >= target) {
        startCelebration()
        celebrated = true
      }

      updateHud(frame)
    },

    teardown() {
      if (appRef && celebrateTick) appRef.ticker.remove(celebrateTick)
      celebrateTick = null
      celebrating = false
      celebrated = false
      board?.destroy({ children: true })
      board = null
      token = null
      hud = null
      confetti = []
      fruitGfx.clear()
      appRef = null
    },
  }
}
