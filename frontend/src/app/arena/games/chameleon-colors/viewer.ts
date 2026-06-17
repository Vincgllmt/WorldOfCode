import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Text, Texture, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { ColorsFrame, ColorsInit, SkinColor } from './types'

const COLOR = {
  floor: 0x143b25,
  wall: 0x0a160f,
  start: 0xcfd6dc,
}

// Couleurs des fruits et teintes de peau correspondantes.
const FRUIT_HEX: Record<SkinColor, number> = { R: 0xf85149, G: 0x3fb950, B: 0x58a6ff }
const NEUTRAL_TINT = 0xffffff // peau neutre = sprite tel quel
const COLOR_NAME: Record<SkinColor, string> = { R: 'Rouge', G: 'Vert', B: 'Bleu' }
const CONFETTI = [0xf85149, 0x3fb950, 0x58a6ff, 0xf0d000, 0xffffff, 0xd2a8ff]

// Spritesheet caméléon réutilisée du Labyrinthe (4×4, frames de 128×128).
const SHEET = '/games/maze/cameleon.png'
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
  let hud: Text | null = null
  let fxBanner: Container | null = null
  let confetti: Confetti[] = []
  const fruitGfx = new Map<string, Graphics>()

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
    if (fxBanner) fxBanner.visible = true
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
    if (fxBanner) {
      fxBanner.visible = false
      fxBanner.scale.set(0)
    }
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

      const wallSet = new Set(init.walls.map(([x, y]) => `${x},${y}`))
      for (let y = 0; y < init.rows; y++) {
        for (let x = 0; x < init.cols; x++) {
          const isWall = wallSet.has(`${x},${y}`)
          const g = new Graphics()
          g.roundRect(ox + x * cell + 1.5, oy + y * cell + 1.5, cell - 3, cell - 3, 5).fill(
            isWall ? COLOR.wall : COLOR.floor,
          )
          board.addChild(g)
        }
      }

      const s = center(init.start[0], init.start[1])
      board.addChild(new Graphics().circle(s.x, s.y, cell * 0.26).fill({ color: COLOR.start, alpha: 0.9 }))

      // Fruits colorés.
      for (const fruit of init.fruits) {
        const c = center(fruit.pos[0], fruit.pos[1])
        const g = new Graphics()
        g.circle(c.x, c.y, cell * 0.28).fill(FRUIT_HEX[fruit.color])
        g.circle(c.x - cell * 0.08, c.y - cell * 0.08, cell * 0.08).fill({ color: 0xffffff, alpha: 0.5 })
        board.addChild(g)
        fruitGfx.set(`${fruit.pos[0]},${fruit.pos[1]}`, g)
      }

      // Caméléon animé.
      const sheet = await Assets.load<Texture>(SHEET)
      const walk: Texture[] = []
      for (let c = 0; c < WALK_FRAMES; c++) {
        walk.push(new Texture({ source: sheet.source, frame: new Rectangle(c * FRAME, WALK_ROW * FRAME, FRAME, FRAME) }))
      }
      token = new AnimatedSprite(walk)
      token.anchor.set(0.5)
      token.animationSpeed = 0.12
      token.play()
      token.width = cell * 0.82
      token.height = cell * 0.82
      tokenBaseScale = token.scale.x
      board.addChild(token)
      token.position.set(s.x, s.y)

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

      // Bannière de réussite.
      fxBanner = new Container()
      fxBanner.addChild(new Graphics().roundRect(-95, -28, 190, 56, 14).fill({ color: 0x11a84f, alpha: 0.95 }))
      const bannerTxt = new Text({
        text: 'RÉUSSI !',
        style: { fill: 0xffffff, fontSize: 26, fontFamily: 'monospace', fontWeight: 'bold' },
      })
      bannerTxt.anchor.set(0.5)
      fxBanner.addChild(bannerTxt)
      fxBanner.position.set(w / 2, h * 0.42)
      fxBanner.scale.set(0)
      fxBanner.visible = false
      board.addChild(fxBanner)

      // Boucle d'animation de la célébration (indépendante du replay).
      celebrateTick = (ticker: Ticker) => {
        if (!celebrating || !fxBanner || !token) return
        const dt = ticker.deltaMS
        celebT += dt
        const grow = Math.min(1, celebT / 220)
        const eased = 1 - Math.pow(1 - grow, 3)
        fxBanner.scale.set(eased * (1 + 0.1 * Math.sin(celebT / 90)))
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

      // Teinte selon la peau.
      token.tint = frame.skin ? FRUIT_HEX[frame.skin] : NEUTRAL_TINT

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
      fxBanner = null
      confetti = []
      fruitGfx.clear()
      appRef = null
    },
  }
}
