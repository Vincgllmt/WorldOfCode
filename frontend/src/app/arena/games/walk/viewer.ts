import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { WalkFrame, WalkInit } from './types'

const COLOR = {
  skyTop: 0x07160f,
  skyHorizon: 0x2c6b45,
  depthBottom: 0x061109,
  sun: 0xf6e2a0,
  farTree: 0x0f2c1d,
  canopy: 0x17452c,
  bark: 0x53341f,
  barkTop: 0x7a5232,
  barkDark: 0x35200f,
  twig: 0x4a2f1b,
  leaf: 0x2f7a4c,
  leafDark: 0x1d5233,
  markDim: 0x0f2c1d,
  markLit: 0xf6c84c,
  goal: 0xf6c84c,
  hud: 0xd6e7dc,
  hudPanel: 0x07160f,
}

// Spritesheet caméléon 4×4 (512×512), partagée avec le labyrinthe et le platformer.
const SHEET = '/games/maze/cameleon.png'
const FRAME = 128
const WALK_ROW = 0
const WALK_FRAMES = 4
const FACE_RIGHT = -Math.PI / 2 // la ligne 0 de la spritesheet regarde vers le bas

const STRAWBERRY = '/games/chameleon-colors/fruit-r.png'

/** Au-delà, les numéros de pas se chevauchent : on ne garde que les pastilles. */
const MAX_LABELLED_STEPS = 12

/** Interpolation entre deux couleurs 0xRRGGBB. */
function mix(a: number, b: number, t: number): number {
  const ch = (c: number, shift: number) => (c >> shift) & 255
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t)
  const g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t)
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t)
  return (r << 16) | (g << 8) | bl
}

/** Générateur pseudo-aléatoire déterministe : même décor à chaque relecture du replay. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/**
 * Viewer PixiJS de la promenade : une branche traversant une canopée, un caméléon
 * qui avance d'un pas par frame, une fraise au bout.
 *
 * Comme le platformer, la scène est dessinée en coordonnées ÉCRAN et intégralement
 * reconstruite au redimensionnement : la branche occupe toujours toute la largeur,
 * quelle que soit la distance, et le décor remplit la hauteur.
 */
export function createWalkViewer(): GameViewer<WalkInit, WalkFrame> {
  let board: Container | null = null
  let scene: Container | null = null // décor statique, reconstruit au resize
  let actors: Container | null = null // caméléon, fraise, HUD : créés une fois
  let token: AnimatedSprite | null = null
  let goal: Sprite | Graphics | null = null
  let goalGlow: Graphics | null = null
  let hud: Text | null = null
  let hudPanel: Graphics | null = null
  let marks: { lit: Graphics; dim: Graphics }[] = []
  let savedInit: WalkInit | null = null
  let appW = 0
  let appH = 0

  /** Toutes les mesures de la scène, dérivées de la taille courante du canvas. */
  const metrics = () => {
    const distance = Math.max(1, savedInit?.distance ?? 1)
    const marginL = appW * 0.08
    const marginR = appW * 0.11 // un peu plus à droite : la fraise déborde de son pas
    const span = Math.max(1, appW - marginL - marginR)
    const stepW = span / distance
    const branchY = appH * 0.6 // dessus de la branche
    const branchH = Math.max(10, appH * 0.055)
    // Le caméléon grandit quand les pas sont espacés, sans jamais écraser la scène.
    const cham = Math.min(appH * 0.3, stepW * 1.7, appW * 0.17)
    return { distance, marginL, span, stepW, branchY, branchH, cham }
  }

  const stepX = (i: number) => {
    const m = metrics()
    return m.marginL + m.stepW * i
  }

  /** Place les acteurs (créés une seule fois) selon les mesures courantes. */
  const placeActors = () => {
    if (!savedInit) return
    const m = metrics()

    if (token) {
      token.scale.set(m.cham / FRAME)
      token.position.set(stepX(0), m.branchY - m.cham / 2)
    }

    const gx = stepX(m.distance)
    if (goal) {
      if (goal instanceof Sprite) {
        goal.width = m.cham * 0.62
        goal.height = m.cham * 0.62
      }
      goal.position.set(gx, m.branchY)
    }
    if (goalGlow) goalGlow.position.set(gx, m.branchY - m.cham * 0.3)

    const fs = Math.max(11, Math.round(appH * 0.045))
    if (hud) {
      hud.style.fontSize = fs
      hud.position.set(appW * 0.035 + fs * 0.6, appH * 0.05)
    }
    if (hudPanel) {
      hudPanel.clear()
      hudPanel
        .roundRect(appW * 0.035, appH * 0.05 - fs * 0.35, fs * 7.4, fs * 1.7, fs * 0.5)
        .fill({ color: COLOR.hudPanel, alpha: 0.55 })
    }
  }

  /** Reconstruit tout le décor statique. Appelé au setup et à chaque resize. */
  const buildScene = (app: Application) => {
    if (!scene || !savedInit) return
    appW = app.screen.width
    appH = app.screen.height
    scene.removeChildren()
    marks = []

    const m = metrics()
    const rnd = seeded(1337 + m.distance)

    // 1. Ciel : dégradé en bandes, du sombre en haut vers la lumière à hauteur de branche.
    const BANDS = 20
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1)
      scene.addChild(
        new Graphics()
          .rect(0, (m.branchY * i) / BANDS, appW, m.branchY / BANDS + 1)
          .fill(mix(COLOR.skyTop, COLOR.skyHorizon, t * t)),
      )
    }
    // Sous la branche : on repart vers le sombre pour donner de la profondeur.
    const below = appH - m.branchY
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1)
      scene.addChild(
        new Graphics()
          .rect(0, m.branchY + (below * i) / BANDS, appW, below / BANDS + 1)
          .fill(mix(COLOR.skyHorizon, COLOR.depthBottom, Math.sqrt(t))),
      )
    }

    // 2. Halo de soleil, en haut à droite.
    for (const [r, a] of [[0.26, 0.05], [0.17, 0.06], [0.1, 0.08]] as [number, number][]) {
      scene.addChild(
        new Graphics()
          .circle(appW * 0.82, appH * 0.16, appH * r)
          .fill({ color: COLOR.sun, alpha: a }),
      )
    }

    // 3. Arbres lointains : silhouettes floues derrière la branche.
    const trees = 6
    for (let i = 0; i < trees; i++) {
      const tx = appW * (0.04 + 0.92 * (i / (trees - 1))) + (rnd() - 0.5) * appW * 0.05
      const th = appH * (0.3 + rnd() * 0.22)
      const g = new Graphics()
      g.rect(tx - appW * 0.006, m.branchY - th * 0.35, appW * 0.012, th * 0.55).fill(COLOR.farTree)
      for (const [ox, oy, orr] of [[0, -0.34, 0.16], [-0.05, -0.26, 0.12], [0.05, -0.27, 0.13]] as [number, number, number][]) {
        g.circle(tx + appW * ox, m.branchY - th * 0.35 + th * oy, th * orr).fill(COLOR.farTree)
      }
      g.alpha = 0.55
      scene.addChild(g)
    }

    // 4. Canopée : amas de feuilles suspendus au bord haut, pour cadrer la scène.
    const clusters = 7
    for (let i = 0; i < clusters; i++) {
      const cx = appW * (i / (clusters - 1)) + (rnd() - 0.5) * appW * 0.08
      const cy = -appH * 0.04 + rnd() * appH * 0.06
      const g = new Graphics()
      for (let k = 0; k < 5; k++) {
        g.ellipse(
          cx + (rnd() - 0.5) * appW * 0.1,
          cy + rnd() * appH * 0.1,
          appW * (0.04 + rnd() * 0.04),
          appH * (0.03 + rnd() * 0.03),
        ).fill({ color: k % 2 ? COLOR.canopy : COLOR.leafDark, alpha: 0.9 })
      }
      scene.addChild(g)
    }

    // 5. Rameaux sous la branche, avec leurs feuilles.
    for (let i = 0; i < m.distance; i++) {
      if (i % 3 !== 1) continue
      const x = stepX(i) + m.stepW * 0.5
      const len = m.branchH * (1.6 + rnd())
      const g = new Graphics()
      g.moveTo(x, m.branchY + m.branchH)
        .lineTo(x + m.stepW * 0.18, m.branchY + m.branchH + len)
        .stroke({ color: COLOR.twig, width: Math.max(2, m.branchH * 0.12) })
      for (let k = 0; k < 3; k++) {
        g.ellipse(
          x + m.stepW * (0.1 + k * 0.07),
          m.branchY + m.branchH + len * (0.45 + k * 0.22),
          m.stepW * 0.16,
          m.branchH * 0.24,
        ).fill({ color: k % 2 ? COLOR.leaf : COLOR.leafDark, alpha: 0.95 })
      }
      scene.addChild(g)
    }

    // 6. La branche elle-même : corps, dessus éclairé, ombre et nervures d'écorce.
    const branch = new Graphics()
    branch.roundRect(0, m.branchY, appW, m.branchH, m.branchH * 0.35).fill(COLOR.bark)
    branch.roundRect(0, m.branchY, appW, m.branchH * 0.24, m.branchH * 0.2).fill(COLOR.barkTop)
    branch.roundRect(0, m.branchY + m.branchH * 0.72, appW, m.branchH * 0.28, m.branchH * 0.2)
      .fill({ color: COLOR.barkDark, alpha: 0.7 })
    for (let i = 0; i < 26; i++) {
      const bx = rnd() * appW
      branch
        .moveTo(bx, m.branchY + m.branchH * 0.35)
        .lineTo(bx + appW * 0.02, m.branchY + m.branchH * 0.62)
        .stroke({ color: COLOR.barkDark, width: Math.max(1, m.branchH * 0.05), alpha: 0.5 })
    }
    scene.addChild(branch)

    // 7. Un repère par pas : pastille éteinte, doublée d'une pastille allumée
    //    que renderFrame révèle au passage du caméléon.
    for (let i = 0; i <= m.distance; i++) {
      const x = stepX(i)
      const y = m.branchY + m.branchH * 0.5
      const r = Math.max(2.5, m.branchH * 0.16)

      const dim = new Graphics().circle(x, y, r).fill({ color: COLOR.markDim, alpha: 0.85 })
      const lit = new Graphics()
        .circle(x, y, r * 2.1)
        .fill({ color: COLOR.markLit, alpha: 0.18 })
        .circle(x, y, r)
        .fill(COLOR.markLit)
      lit.alpha = 0
      scene.addChild(dim)
      scene.addChild(lit)
      marks.push({ dim, lit })

      if (m.distance <= MAX_LABELLED_STEPS && i > 0) {
        const label = new Text({
          text: String(i),
          style: { fontSize: Math.max(9, Math.round(m.branchH * 0.5)), fill: COLOR.hud, fontFamily: 'monospace' },
        })
        label.anchor.set(0.5, 0)
        label.alpha = 0.5
        label.position.set(x, m.branchY + m.branchH * 1.35)
        scene.addChild(label)
      }
    }

    placeActors()
  }

  return {
    async setup(app: Application, init: WalkInit) {
      savedInit = init
      board = new Container()
      scene = new Container()
      actors = new Container()
      board.addChild(scene)
      board.addChild(actors)
      app.stage.addChild(board)

      buildScene(app)

      // Halo derrière la fraise (dessiné avant elle pour rester en arrière-plan).
      goalGlow = new Graphics()
      for (const [r, a] of [[34, 0.1], [22, 0.14], [13, 0.2]] as [number, number][]) {
        goalGlow.circle(0, 0, r).fill({ color: COLOR.goal, alpha: a })
      }
      actors.addChild(goalGlow)

      // La fraise, au bout de la branche.
      try {
        const tex = await Assets.load<Texture>(STRAWBERRY)
        const fruit = new Sprite(tex)
        fruit.anchor.set(0.5, 1)
        goal = fruit
      } catch {
        // Image absente : pastille dorée de repli, le replay reste lisible.
        goal = new Graphics().circle(0, -14, 14).fill(COLOR.goal)
      }
      actors.addChild(goal)

      // Caméléon animé (cycle de marche), découpé depuis la spritesheet.
      const sheet = await Assets.load<Texture>(SHEET)
      const walk: Texture[] = []
      for (let c = 0; c < WALK_FRAMES; c++) {
        walk.push(
          new Texture({
            source: sheet.source,
            frame: new Rectangle(c * FRAME, WALK_ROW * FRAME, FRAME, FRAME),
          }),
        )
      }
      token = new AnimatedSprite(walk)
      token.anchor.set(0.5)
      token.animationSpeed = 0.14
      token.play()
      // Échelle plutôt que width/height : le sprite est pivoté, sa « largeur »
      // mesurerait alors sa boîte englobante et fausserait la taille.
      token.rotation = FACE_RIGHT
      actors.addChild(token)

      // Compteur de pas : le joueur relie sa sortie au nombre de pas effectués.
      hudPanel = new Graphics()
      actors.addChild(hudPanel)
      hud = new Text({ text: '', style: { fontSize: 14, fill: COLOR.hud, fontFamily: 'monospace' } })
      hud.anchor.set(0, 0)
      actors.addChild(hud)

      placeActors()
    },

    resize(app: Application) {
      buildScene(app)
    },

    renderFrame(frame: WalkFrame, t: number, prev: WalkFrame | null) {
      if (!token || !savedInit) return
      const m = metrics()

      const from = prev ? prev.pos : frame.pos
      const to = frame.pos
      const progress = from + (to - from) * t

      let x = stepX(from) + (stepX(to) - stepX(from)) * t
      let y = m.branchY - m.cham / 2

      // Rebond de marche, pour que le pas se voie.
      if (to !== from) y -= Math.sin(Math.PI * Math.min(1, t)) * m.cham * 0.14

      // Ordre incompris : le caméléon s'agite sur place sans avancer.
      if (frame.event === 'unknown') x += Math.sin(t * Math.PI * 6) * m.stepW * 0.16
      // Arrêt au mauvais endroit : il cherche la fraise du regard.
      if (frame.event === 'miss') y -= Math.abs(Math.sin(t * Math.PI * 2)) * m.cham * 0.1

      token.position.set(x, y)

      // Les pastilles s'allument au fur et à mesure : la progression se lit d'un coup d'œil.
      for (let i = 0; i < marks.length; i++) {
        const passed = i <= progress + 0.001
        marks[i].lit.alpha = passed ? 1 : 0
        // Le pas qui vient d'être atteint « éclot » légèrement.
        const fresh = Math.max(0, 1 - Math.abs(progress - i) * 2.5)
        marks[i].lit.scale.set(1 + fresh * 0.35)
      }

      // La fraise disparaît quand le caméléon l'attrape.
      const eaten = frame.event === 'goal' ? Math.max(0, 1 - t * 1.4) : 1
      if (goal) goal.alpha = eaten
      if (goalGlow) goalGlow.alpha = eaten

      if (hud) hud.text = `${Math.round(progress)} / ${m.distance} pas`
    },

    teardown() {
      board?.destroy({ children: true })
      board = null
      scene = null
      actors = null
      token = null
      goal = null
      goalGlow = null
      hud = null
      hudPanel = null
      marks = []
      savedInit = null
    },
  }
}
