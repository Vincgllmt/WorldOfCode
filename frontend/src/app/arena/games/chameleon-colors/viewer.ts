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

      // Rendu « nature » : pas de grille visible, une prairie 2D (la logique reste en cases).
      const boardW = init.cols * cell
      const boardH = init.rows * cell
      board.addChild(new Graphics().roundRect(ox, oy, boardW, boardH, 14).fill(0x2e6b3c))

      // Obstacles optionnels en image (buisson / arbre) ; sinon buisson vectoriel.
      const obstacleTex: Texture[] = []
      for (const url of [BUSH_PNG, TREE_PNG]) {
        try {
          obstacleTex.push(await Assets.load<Texture>(url))
        } catch {
          /* image absente -> ignorée */
        }
      }

      // Murs → obstacles (buisson / arbre en alternance, ou buisson vectoriel en repli).
      for (let wi = 0; wi < init.walls.length; wi++) {
        const [wx, wy] = init.walls[wi]
        const c = center(wx, wy)
        if (obstacleTex.length) {
          const tex = obstacleTex[wi % obstacleTex.length]
          // ombre au sol (pour « poser » l'obstacle)
          board.addChild(new Graphics().ellipse(c.x, c.y + cell * 0.34, cell * 0.24, cell * 0.07).fill({ color: 0x123018, alpha: 0.32 }))
          const sprite = new Sprite(tex)
          sprite.anchor.set(0.5, 1) // posé par la base
          const hsize = cell * 0.92 // tient dans la case (hauteur) → pas de débordement
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
