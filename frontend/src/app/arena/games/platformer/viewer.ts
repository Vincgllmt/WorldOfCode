import {
  AnimatedSprite, Application, Assets, Container,
  Graphics, Rectangle, Text, Texture,
} from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'
import type { GauntletBlock, GauntletFrame, GauntletInit } from './types'

const SHEET       = '/games/maze/cameleon.png'
const FRAME_SIZE  = 128
const WALK_FRAMES = 4
const FACE_RIGHT  = -Math.PI / 2   // sprite row-0 faces down → rotate to face right
const JUMP_H_RATIO = 3.2            // 0.60 × 3.2 = 1.92 > 1.0 (obstacle max height) ✓

// ─── Mario-world palettes ─────────────────────────────────────────────────────
const M = {
  sky:       0x5C94FC,  // Mario classic blue
  skyDark:   0x000080,  // underground / night
  brick:     0x9B6D2B,
  brickDark: 0x7B4D1B,
  brickLine: 0x5A3A10,
  coin:      0xFFC800,
  coinShine: 0xFFE860,
  pipe:      0x147014,
  pipeLight: 0x38A838,
  hill:      0x00A800,
  hillLight: 0x44CC44,
  cloud:     0xFFFFFF,
  cloudShadow: 0xC8D8F8,
  qBlock:    0xE86820,
  qBlockTop: 0xFCAC50,
  lava:      0xFF4400,
  lavaLight: 0xFF8800,
  ghost:     0xEEEEEE,
  ghostEye:  0x222222,
  snow:      0xEEF4FF,
  ice:       0xA8DCFF,
  sand:      0xF0C870,
  sandDark:  0xC8A040,
  mushRed:   0xD82020,
  mushWhite: 0xFFFFFF,
  mushStem:  0xF0D8A8,
  lavaRock:  0x3A2010,
  castle:    0x888888,
  castleDark: 0x555555,
}

// ─── Themes ───────────────────────────────────────────────────────────────────

type ThemeName = 'plains' | 'underground' | 'desert' | 'snow' | 'castle' | 'beach' | 'ghost' | 'sky'

const PROBLEM_THEME: Record<string, ThemeName> = {
  SUCCESSOR:   'plains',
  IS_NEGATIVE: 'underground',
  ABS:         'desert',
  MIN:         'snow',
  SUM:         'castle',
  REVERSE:     'beach',
  UNIQUE:      'ghost',
  SORT:        'sky',
}

interface ThemeDef {
  skyTop:    number
  skyBot:    number
  ground:    number
  labelColor: number
  drawBg:       (b: Container, W: number, H: number, gy: number, bs: number) => void
  drawObstacle: (g: Graphics,  cx: number, gy: number, bs: number) => void
}

const THEMES: Record<ThemeName, ThemeDef> = {

  // 1 ── Plains (World 1) ──────────────────────────────────────────────────────
  plains: {
    skyTop: M.sky, skyBot: M.sky, ground: M.brick, labelColor: M.coin,
    drawBg(b, W, H, gy, bs) {
      // Rolling green hills
      for (const [hx, hr] of [[0.15, W*0.22], [0.5, W*0.18], [0.82, W*0.2]] as [number,number][])
        _hill(b, W*hx, gy, hr)
      // Clouds
      _cloud(b, W*0.18, H*0.14, bs*1.4)
      _cloud(b, W*0.55, H*0.1, bs*1.0)
      _cloud(b, W*0.8,  H*0.18, bs*1.2)
      // Pipes
      _pipe(b, W*0.08, gy, bs*1.1, bs)
      _pipe(b, W*0.75, gy, bs*0.75, bs)
      // Coins + ? block
      _coin(b, W*0.38, gy - bs*2.2, bs*0.14)
      _coin(b, W*0.42, gy - bs*2.2, bs*0.14)
      _coin(b, W*0.46, gy - bs*2.2, bs*0.14)
      _qBlock(b, W*0.62, gy - bs*2.0, bs*0.38)
    },
    drawObstacle(g, cx, gy, bs) { _goombaCactus(g, cx, gy, bs) },
  },

  // 2 ── Underground ──────────────────────────────────────────────────────────
  underground: {
    skyTop: 0x000040, skyBot: 0x000030, ground: 0x5A3A10, labelColor: M.coin,
    drawBg(b, W, H, gy, bs) {
      // Brick ceiling suggestion
      b.addChild(new Graphics().rect(0, 0, W, bs*0.45).fill(0x3A2808))
      for (let i = 0; i < 12; i++) {
        const bx = i * W/11
        b.addChild(new Graphics().rect(bx, 0, W/12 - 2, bs*0.45).fill(0x5A3A10))
      }
      // Stalactites
      for (const [sx, sh] of [[0.1,bs*0.8],[0.22,bs*0.5],[0.38,bs*1.0],[0.6,bs*0.65],[0.78,bs*0.9]] as [number,number][]) {
        b.addChild(new Graphics()
          .poly([W*sx, bs*0.45, W*sx - bs*0.08, bs*0.45 + sh, W*sx + bs*0.08, bs*0.45 + sh])
          .fill(0x7B5A25))
      }
      // Coins
      for (let i = 0; i < 5; i++) {
        _coin(b, W*(0.25 + i*0.12), gy - bs*(1.2 + (i%3)*0.3), bs*0.13)
      }
      // ? blocks row
      _qBlock(b, W*0.35, gy - bs*1.8, bs*0.38)
      _qBlock(b, W*0.45, gy - bs*1.8, bs*0.38)
      _qBlock(b, W*0.55, gy - bs*1.8, bs*0.38)
    },
    drawObstacle(g, cx, gy, bs) { _brickPillar(g, cx, gy, bs) },
  },

  // 3 ── Desert (World 2) ─────────────────────────────────────────────────────
  desert: {
    skyTop: 0xF0B858, skyBot: 0xF8D880, ground: M.sandDark, labelColor: 0xFFFFAA,
    drawBg(b, W, H, gy, bs) {
      // Sun
      const sx = W*0.82, sy = H*0.13, sr = bs*0.52
      b.addChild(new Graphics().circle(sx, sy, sr*1.6).fill({ color: 0xFFDD00, alpha: 0.15 }))
      b.addChild(new Graphics().circle(sx, sy, sr).fill(0xFFDD00))
      // Pyramids
      for (const [px, pw, ph] of [[0.12,0.18,0.28],[0.38,0.12,0.2],[0.72,0.15,0.24]] as [number,number,number][]) {
        b.addChild(new Graphics()
          .poly([W*px, gy - H*ph, W*px - W*pw/2, gy, W*px + W*pw/2, gy])
          .fill(0xD4A840))
        b.addChild(new Graphics()
          .poly([W*px, gy - H*ph, W*px + W*pw*0.05, gy - H*ph, W*px + W*pw/2, gy, W*px + W*pw*0.45, gy])
          .fill({ color: 0xB88820, alpha: 0.5 }))
      }
      // Sand dunes
      for (const [dx, dr] of [[0.25,W*0.15],[0.6,W*0.18],[0.88,W*0.12]] as [number,number][])
        b.addChild(new Graphics().ellipse(W*dx, gy, dr, bs*0.35).fill({ color: M.sand, alpha: 0.6 }))
      // Coins in arc
      for (let i = 0; i < 4; i++)
        _coin(b, W*(0.3 + i*0.1), gy - bs*(1.5 + Math.sin(i * 0.8) * 0.3), bs*0.12)
    },
    drawObstacle(g, cx, gy, bs) { _cactus(g, cx, gy, bs) },
  },

  // 4 ── Snow / Ice World ─────────────────────────────────────────────────────
  snow: {
    skyTop: 0xB8D8F8, skyBot: 0xDDEEFF, ground: M.snow, labelColor: 0x0044AA,
    drawBg(b, W, H, gy, bs) {
      // Clouds (big fluffy)
      _cloud(b, W*0.2,  H*0.12, bs*1.6)
      _cloud(b, W*0.65, H*0.08, bs*1.3)
      // Snowy hills
      for (const [hx, hr] of [[0.1,W*0.2],[0.45,W*0.25],[0.8,W*0.18]] as [number,number][]) {
        b.addChild(new Graphics().ellipse(W*hx, gy, hr, bs*0.55).fill(0xDDEEFF))
        b.addChild(new Graphics().ellipse(W*hx, gy - bs*0.4, hr*0.6, bs*0.18).fill({ color: 0xffffff, alpha: 0.8 }))
      }
      // Snow-capped pines
      for (const [tx, th] of [[0.05,bs*1.6],[0.15,bs*1.3],[0.72,bs*1.7],[0.88,bs*1.4]] as [number,number][]) {
        _pine(b, W*tx, gy, th, 0x5A7A9A)
        b.addChild(new Graphics().ellipse(W*tx, gy - th, th*0.25, th*0.09).fill({ color: 0xffffff, alpha: 0.9 }))
      }
      // Snowflakes
      for (let i = 0; i < 18; i++) {
        const fx = W * ((i * 0.059 + 0.03) % 0.96)
        const fy = H * 0.05 + H * 0.52 * ((i * 0.071) % 1)
        b.addChild(new Graphics().circle(fx, fy, 1.5 + i % 2).fill({ color: 0xffffff, alpha: 0.75 }))
      }
      // ? blocks
      _qBlock(b, W*0.4, gy - bs*2.0, bs*0.38)
      _qBlock(b, W*0.58, gy - bs*2.0, bs*0.38)
    },
    drawObstacle(g, cx, gy, bs) { _iceSpike(g, cx, gy, bs) },
  },

  // 5 ── Castle / Dark Land (World 8) ─────────────────────────────────────────
  castle: {
    skyTop: 0x200808, skyBot: 0x601010, ground: 0x282018, labelColor: 0xFF8844,
    drawBg(b, W, H, gy, bs) {
      // Lava ground glow
      b.addChild(new Graphics().rect(0, gy, W, H - gy).fill(0x1A0808))
      b.addChild(new Graphics().rect(0, gy, W, bs*0.12).fill({ color: M.lava, alpha: 0.45 }))
      // Castle battlements silhouette
      const wallY = gy - H*0.4
      b.addChild(new Graphics().rect(0, wallY, W, H*0.4).fill({ color: 0x1A1010, alpha: 0.7 }))
      for (let i = 0; i < 14; i++) {
        const mx = i * W/13
        b.addChild(new Graphics().rect(mx, wallY - bs*0.4, W/14 - 3, bs*0.4).fill({ color: 0x2A1818, alpha: 0.8 }))
      }
      // Lava pits bubbles
      for (let i = 0; i < 6; i++) {
        const lx = W*(0.1 + i*0.15), lsize = bs*(0.06 + (i%3)*0.03)
        b.addChild(new Graphics().circle(lx, gy + bs*0.2, lsize).fill({ color: M.lava, alpha: 0.6 }))
        b.addChild(new Graphics().circle(lx, gy + bs*0.2, lsize*0.5).fill({ color: M.lavaLight, alpha: 0.4 }))
      }
      // Fire columns
      for (const [fx] of [[W*0.12],[W*0.6],[W*0.88]] as [number][]) {
        b.addChild(new Graphics().ellipse(fx, gy - bs*0.5, bs*0.15, bs*0.55).fill({ color: M.lava, alpha: 0.55 }))
        b.addChild(new Graphics().ellipse(fx, gy - bs*0.6, bs*0.08, bs*0.3).fill({ color: M.lavaLight, alpha: 0.6 }))
      }
    },
    drawObstacle(g, cx, gy, bs) { _lavaColumn(g, cx, gy, bs) },
  },

  // 6 ── Beach / Water World ───────────────────────────────────────────────────
  beach: {
    skyTop: 0x44AADD, skyBot: 0x88CCEE, ground: M.sandDark, labelColor: 0x004488,
    drawBg(b, W, H, gy, bs) {
      // Sea strip
      b.addChild(new Graphics().rect(0, gy + bs*0.3, W, H - gy - bs*0.3).fill(0x1A88CC))
      // Waves
      for (let i = 0; i < 7; i++) {
        const wy = gy + bs*(0.35 + i*0.11)
        b.addChild(new Graphics()
          .ellipse(W*(0.08 + i*0.13), wy, bs*0.55, bs*0.065)
          .fill({ color: 0xffffff, alpha: 0.35 }))
      }
      // Clouds
      _cloud(b, W*0.2,  H*0.12, bs*1.3)
      _cloud(b, W*0.72, H*0.09, bs*1.0)
      // Palm trees
      _palm(b, W*0.06, gy, bs*1.6)
      _palm(b, W*0.92, gy, bs*1.4)
      // Coins in arc above water
      for (let i = 0; i < 5; i++)
        _coin(b, W*(0.27 + i*0.11), gy - bs*(1.4 + Math.sin(i * 0.9) * 0.25), bs*0.13)
      // Fish silhouettes in water
      for (const [fx, fy] of [[W*0.3, gy+bs*0.5],[W*0.6, gy+bs*0.65],[W*0.8, gy+bs*0.45]] as [number,number][]) {
        b.addChild(new Graphics().ellipse(fx, fy, bs*0.18, bs*0.09).fill({ color: 0xFF6633, alpha: 0.6 }))
        b.addChild(new Graphics().poly([fx+bs*0.18, fy, fx+bs*0.28, fy-bs*0.09, fx+bs*0.28, fy+bs*0.09]).fill({ color: 0xFF6633, alpha: 0.6 }))
      }
    },
    drawObstacle(g, cx, gy, bs) { _coral(g, cx, gy, bs) },
  },

  // 7 ── Ghost House ──────────────────────────────────────────────────────────
  ghost: {
    skyTop: 0x100820, skyBot: 0x241440, ground: 0x1A1A28, labelColor: 0xCC88FF,
    drawBg(b, W, H, gy, bs) {
      // Moon
      b.addChild(new Graphics().circle(W*0.78, H*0.14, bs*0.48).fill(0xF8F0C0))
      b.addChild(new Graphics().circle(W*0.82, H*0.12, bs*0.4).fill(0x241440))
      // Stars
      for (let i = 0; i < 35; i++) {
        const sr = 1 + Math.sin(i * 2.1) * 0.6
        b.addChild(new Graphics()
          .circle(W * ((i * 0.073 + 0.02) % 0.97), H * ((i * 0.051 + 0.02) % 0.62), sr)
          .fill({ color: 0xffffff, alpha: 0.45 + Math.sin(i) * 0.25 }))
      }
      // Ghost house bricks
      b.addChild(new Graphics().rect(0, gy - H*0.38, W, H*0.38).fill({ color: 0x1E1A2E, alpha: 0.6 }))
      // Windows with candles
      for (const [wx] of [[W*0.15],[W*0.38],[W*0.62],[W*0.85]] as [number][]) {
        b.addChild(new Graphics().rect(wx - bs*0.15, gy - H*0.3, bs*0.3, bs*0.35).fill({ color: 0xFFCC44, alpha: 0.25 }))
        // Candle
        b.addChild(new Graphics().rect(wx - 2, gy - bs*0.45, 4, bs*0.22).fill(0xEEEECC))
        b.addChild(new Graphics().ellipse(wx, gy - bs*0.47, 4, 7).fill({ color: 0xFF8800, alpha: 0.8 }))
      }
      // Boo ghosts
      for (const [bx, by] of [[W*0.22, gy-bs*1.4],[W*0.6, gy-bs*1.1],[W*0.82, gy-bs*1.6]] as [number,number][]) {
        b.addChild(new Graphics().circle(bx, by, bs*0.18).fill({ color: M.ghost, alpha: 0.7 }))
        b.addChild(new Graphics().circle(bx - bs*0.06, by - bs*0.04, bs*0.04).fill({ color: M.ghostEye, alpha: 0.8 }))
        b.addChild(new Graphics().circle(bx + bs*0.06, by - bs*0.04, bs*0.04).fill({ color: M.ghostEye, alpha: 0.8 }))
      }
    },
    drawObstacle(g, cx, gy, bs) { _crystalGhost(g, cx, gy, bs) },
  },

  // 8 ── Sky World ─────────────────────────────────────────────────────────────
  sky: {
    skyTop: 0x88C8FF, skyBot: 0xC8E8FF, ground: 0xDDEEFF, labelColor: 0x0044AA,
    drawBg(b, W, H, gy, bs) {
      // Big fluffy clouds everywhere
      _cloud(b, W*0.12, H*0.15, bs*1.8)
      _cloud(b, W*0.42, H*0.08, bs*2.0)
      _cloud(b, W*0.72, H*0.13, bs*1.6)
      _cloud(b, W*0.9,  H*0.22, bs*1.2)
      // Cloud platforms
      for (const [cpx, cpy] of [[0.25, 0.45],[0.55, 0.35],[0.78, 0.5]] as [number,number][]) {
        const cpg = new Graphics()
        cpg.roundRect(W*cpx - bs*0.7, gy - H*cpy, bs*1.4, bs*0.25, bs*0.12).fill({ color: 0xffffff, alpha: 0.9 })
        cpg.roundRect(W*cpx - bs*0.7, gy - H*cpy + bs*0.18, bs*1.4, bs*0.07, 0).fill({ color: M.cloudShadow, alpha: 0.5 })
        b.addChild(cpg)
      }
      // Coins + ? blocks floating
      for (let i = 0; i < 5; i++)
        _coin(b, W*(0.32 + i*0.09), gy - bs*2.3, bs*0.15)
      _qBlock(b, W*0.3,  gy - bs*1.9, bs*0.38)
      _qBlock(b, W*0.68, gy - bs*1.9, bs*0.38)
    },
    drawObstacle(g, cx, gy, bs) { _iceSpike(g, cx, gy, bs) },
  },
}

// ─── Obstacle helpers (max ≈ 1.0 × bs) ──────────────────────────────────────

function _goombaCactus(g: Graphics, cx: number, gy: number, bs: number) {
  // Chunky cartoon cactus with black outline
  const tw = bs * 0.22, th = bs * 0.95
  // Outline
  g.roundRect(cx - tw/2 - 2, gy - th - 2, tw + 4, th + 2, tw/2 + 2).fill(0x000000)
  g.roundRect(cx - tw/2, gy - th, tw, th, tw/2).fill(0x2A8A18)
  // Left arm outline + fill
  const laY = gy - th * 0.55
  g.roundRect(cx - tw/2 - bs*0.3 - 2, laY - tw/2 - 1, bs*0.3 + 2, tw + 2, tw/2 + 1).fill(0x000000)
  g.roundRect(cx - tw/2 - bs*0.3, laY - tw/2, bs*0.3, tw, tw/2).fill(0x2A8A18)
  g.roundRect(cx - tw/2 - bs*0.3 - 2, laY - bs*0.25 - 2, tw + 2, bs*0.25 + 2, tw/2).fill(0x000000)
  g.roundRect(cx - tw/2 - bs*0.3, laY - bs*0.25, tw, bs*0.25, tw/2).fill(0x2A8A18)
  // Right arm
  const raY = gy - th * 0.38
  g.roundRect(cx + tw/2 - 2, raY - tw/2 - 1, bs*0.25 + 2, tw + 2, tw/2).fill(0x000000)
  g.roundRect(cx + tw/2, raY - tw/2, bs*0.25, tw, tw/2).fill(0x2A8A18)
  g.roundRect(cx + tw/2 + bs*0.25 - tw - 2, raY - bs*0.2 - 2, tw + 2, bs*0.2 + 2, tw/2).fill(0x000000)
  g.roundRect(cx + tw/2 + bs*0.25 - tw, raY - bs*0.2, tw, bs*0.2, tw/2).fill(0x2A8A18)
  // Shine stripe
  g.roundRect(cx - tw/2 + 3, gy - th + bs*0.1, tw*0.3, bs*0.25, 3).fill({ color: 0x88FF44, alpha: 0.5 })
}

function _brickPillar(g: Graphics, cx: number, gy: number, bs: number) {
  const pw = bs * 0.5, ph = bs * 1.0
  const rows = 5, bw = pw / 2 - 1, bh = ph / rows - 1
  // Outline
  g.rect(cx - pw/2 - 2, gy - ph - 2, pw + 4, ph + 2).fill(0x000000)
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * bw * 0.5
    const y = gy - ph + r * (ph / rows)
    for (let c = 0; c < 3; c++) {
      const x = cx - pw/2 + c * bw - offset
      if (x + bw < cx - pw/2 || x > cx + pw/2) continue
      const clampedX = Math.max(cx - pw/2, x)
      const clampedW = Math.min(x + bw, cx + pw/2) - clampedX
      g.rect(clampedX + 1, y + 1, clampedW - 1, bh - 1).fill(M.brick)
      g.rect(clampedX + 1, y + 1, clampedW - 1, 3).fill({ color: M.brickDark, alpha: 0.4 })
    }
  }
}

function _cactus(g: Graphics, cx: number, gy: number, bs: number) {
  const tw = bs*0.2, th = bs*0.95
  g.roundRect(cx-tw/2-2, gy-th-2, tw+4, th+2, tw/2+2).fill(0x000000)
  g.roundRect(cx-tw/2, gy-th, tw, th, tw/2).fill(0xE8C050)
  g.roundRect(cx-tw/2-bs*0.28-2, gy-th*0.55-tw/2-1, bs*0.28+2, tw+2, tw/2).fill(0x000000)
  g.roundRect(cx-tw/2-bs*0.28, gy-th*0.55-tw/2, bs*0.28, tw, tw/2).fill(0xE8C050)
  g.roundRect(cx+tw/2-2, gy-th*0.38-tw/2-1, bs*0.22+2, tw+2, tw/2).fill(0x000000)
  g.roundRect(cx+tw/2, gy-th*0.38-tw/2, bs*0.22, tw, tw/2).fill(0xE8C050)
  // Spines
  for (const [sx, sy] of [[cx-tw/2-4, gy-th*0.7],[cx+tw/2+2, gy-th*0.45]] as [number,number][])
    g.rect(sx, sy, 5, 2).fill(0xFFFFAA)
}

function _lavaColumn(g: Graphics, cx: number, gy: number, bs: number) {
  // Outline
  g.roundRect(cx - bs*0.18 - 2, gy - bs*1.0 - 2, bs*0.36 + 4, bs*1.0 + 2, 4).fill(0x000000)
  g.roundRect(cx - bs*0.18, gy - bs*1.0, bs*0.36, bs*1.0, 4).fill(M.lavaRock)
  // Lava cracks
  for (const [lx, ly, lh] of [[cx-bs*0.07, gy-bs*0.85, bs*0.28],[cx+bs*0.06, gy-bs*0.6, bs*0.2]] as [number,number,number][]) {
    g.rect(lx, ly, 3, lh).fill(M.lava)
    g.rect(lx-1, ly, 2, lh*0.4).fill(M.lavaLight)
  }
  // Fire top
  g.ellipse(cx, gy - bs*1.0, bs*0.22, bs*0.28).fill({ color: M.lava, alpha: 0.9 })
  g.ellipse(cx, gy - bs*1.05, bs*0.12, bs*0.18).fill({ color: M.lavaLight, alpha: 0.8 })
  g.ellipse(cx, gy - bs*1.1, bs*0.05, bs*0.08).fill({ color: 0xFFFFAA, alpha: 0.7 })
}

function _coral(g: Graphics, cx: number, gy: number, bs: number) {
  const col = 0xE84820
  g.roundRect(cx-bs*0.08-2, gy-bs*0.85-2, bs*0.16+4, bs*0.85+2, 5).fill(0x000000)
  g.roundRect(cx-bs*0.08, gy-bs*0.85, bs*0.16, bs*0.85, 5).fill(col)
  for (const [bx, by, bw2, bh] of [
    [cx-bs*0.32, gy-bs*0.72, bs*0.25, bs*0.1],
    [cx+bs*0.08, gy-bs*0.56, bs*0.22, bs*0.1],
    [cx-bs*0.24, gy-bs*0.42, bs*0.2, bs*0.1],
  ] as [number,number,number,number][]) {
    g.roundRect(bx-1, by-1, bw2+2, bh+2, 3).fill(0x000000)
    g.roundRect(bx, by, bw2, bh, 3).fill(col)
  }
  for (const [tx, ty] of [
    [cx-bs*0.32, gy-bs*0.79],[cx+bs*0.3, gy-bs*0.62],
    [cx-bs*0.24, gy-bs*0.48],[cx, gy-bs*0.9],
  ] as [number,number][]) {
    g.circle(tx-1, ty-1, bs*0.085+2).fill(0x000000)
    g.circle(tx, ty, bs*0.08).fill(0xFF6040)
  }
}

function _iceSpike(g: Graphics, cx: number, gy: number, bs: number) {
  for (const [ox, oh, ow] of [
    [0, 1.0, 0.13],
    [-bs*0.2, 0.72, 0.10],
    [bs*0.22, 0.78, 0.11],
  ] as [number,number,number][]) {
    // Black outline
    g.poly([cx+ox, gy-oh*bs-3, cx+ox-ow*bs-3, gy+3, cx+ox+ow*bs+3, gy+3]).fill(0x000000)
    g.poly([cx+ox, gy-oh*bs, cx+ox-ow*bs, gy, cx+ox+ow*bs, gy]).fill(0xA8E0FF)
    g.poly([cx+ox, gy-oh*bs, cx+ox-ow*bs*0.38, gy-oh*bs*0.48, cx+ox]).fill({ color: 0xffffff, alpha: 0.5 })
  }
}

function _crystalGhost(g: Graphics, cx: number, gy: number, bs: number) {
  // Ghost shape
  const r = bs * 0.46
  g.circle(cx-1, gy-r-1, r+3).fill(0x000000)
  g.roundRect(cx-r-3, gy-r-1, r*2+6, r+bs*0.22+3, 3).fill(0x000000)
  // Wavy bottom (5 bumps)
  for (let i = 0; i < 5; i++) {
    const bx = cx - r + i * (r*2/4.5)
    g.circle(bx+1, gy+bs*0.22, r*0.22+2).fill(0x000000)
  }
  // Fill
  g.circle(cx, gy-r, r).fill({ color: M.ghost, alpha: 0.88 })
  g.roundRect(cx-r, gy-r, r*2, r+bs*0.2, 3).fill({ color: M.ghost, alpha: 0.88 })
  for (let i = 0; i < 5; i++) {
    const bx = cx - r + i*(r*2/4.5)
    g.circle(bx, gy+bs*0.2, r*0.22).fill({ color: M.ghost, alpha: 0.88 })
  }
  // Eyes
  g.circle(cx - r*0.32, gy - r*0.5, r*0.18).fill(M.ghostEye)
  g.circle(cx + r*0.32, gy - r*0.5, r*0.18).fill(M.ghostEye)
  g.circle(cx - r*0.28, gy - r*0.52, r*0.08).fill(0xffffff)
  g.circle(cx + r*0.36, gy - r*0.52, r*0.08).fill(0xffffff)
  // Blush
  g.ellipse(cx - r*0.42, gy - r*0.2, r*0.18, r*0.1).fill({ color: 0xFF8888, alpha: 0.45 })
  g.ellipse(cx + r*0.42, gy - r*0.2, r*0.18, r*0.1).fill({ color: 0xFF8888, alpha: 0.45 })
}

// ─── Background helpers ───────────────────────────────────────────────────────

function _cloud(board: Container, x: number, y: number, w: number) {
  const h = w * 0.52
  const g = new Graphics()
  g.roundRect(x - w/2, y - h*0.3, w, h*0.55, h*0.27).fill(M.cloud)
  g.circle(x - w*0.22, y - h*0.38, w*0.24).fill(M.cloud)
  g.circle(x + w*0.08, y - h*0.55, w*0.3).fill(M.cloud)
  g.circle(x + w*0.32, y - h*0.38, w*0.2).fill(M.cloud)
  g.roundRect(x - w*0.46, y + h*0.12, w*0.92, h*0.1, 2).fill({ color: M.cloudShadow, alpha: 0.55 })
  board.addChild(g)
}

function _coin(board: Container, x: number, y: number, r: number) {
  const g = new Graphics()
  g.circle(x, y, r + 1.5).fill(0x000000)
  g.circle(x, y, r).fill(M.coin)
  g.ellipse(x - r*0.25, y - r*0.1, r*0.35, r*0.6).fill({ color: M.coinShine, alpha: 0.7 })
  board.addChild(g)
}

function _qBlock(board: Container, x: number, y: number, size: number) {
  const g  = new Graphics()
  const s  = size
  g.roundRect(x - s/2 - 2, y - s/2 - 2, s + 4, s + 4, 3).fill(0x000000)
  g.rect(x - s/2, y - s/2, s, s).fill(M.qBlock)
  g.rect(x - s/2, y - s/2, s, s*0.18).fill({ color: M.qBlockTop, alpha: 0.8 })
  g.rect(x - s/2, y - s/2, s*0.15, s).fill({ color: M.qBlockTop, alpha: 0.4 })
  g.rect(x - s/2, y + s/2 - s*0.1, s, s*0.1).fill({ color: 0x884000, alpha: 0.6 })
  g.rect(x + s/2 - s*0.1, y - s/2, s*0.1, s).fill({ color: 0x884000, alpha: 0.4 })
  const t = new Text({
    text: '?',
    style: { fill: 0xffffff, fontSize: s * 0.62, fontFamily: 'sans-serif', fontWeight: 'bold' },
  })
  t.anchor.set(0.5)
  t.position.set(x, y + 1)
  board.addChild(g)
  board.addChild(t)
}

function _pipe(board: Container, x: number, groundY: number, h: number, bs: number) {
  const pw = bs * 0.34
  const g  = new Graphics()
  // Body outline
  g.rect(x - pw/2 - 2, groundY - h, pw + 4, h + 2).fill(0x000000)
  g.rect(x - pw/2, groundY - h, pw, h).fill(M.pipe)
  g.rect(x - pw/2, groundY - h, pw*0.28, h).fill({ color: M.pipeLight, alpha: 0.5 })
  // Cap outline
  g.roundRect(x - pw*0.62 - 2, groundY - h - pw*0.32 - 2, pw*1.24 + 4, pw*0.32 + 2, 2).fill(0x000000)
  g.roundRect(x - pw*0.62, groundY - h - pw*0.32, pw*1.24, pw*0.32, 2).fill(M.pipe)
  g.roundRect(x - pw*0.62, groundY - h - pw*0.32, pw*0.35, pw*0.32, 2).fill({ color: M.pipeLight, alpha: 0.4 })
  board.addChild(g)
}

function _hill(board: Container, x: number, groundY: number, r: number) {
  const g = new Graphics()
  g.circle(x,          groundY, r + 3).fill(0x000000)
  g.circle(x - r*0.42, groundY, r*0.65 + 2).fill(0x000000)
  g.circle(x + r*0.42, groundY, r*0.65 + 2).fill(0x000000)
  g.circle(x,          groundY, r).fill(M.hill)
  g.circle(x - r*0.42, groundY, r*0.65).fill(M.hill)
  g.circle(x + r*0.42, groundY, r*0.65).fill(M.hill)
  // Shine dots
  g.circle(x - r*0.1, groundY - r*0.52, r*0.12).fill({ color: M.hillLight, alpha: 0.7 })
  g.circle(x - r*0.3, groundY - r*0.3,  r*0.07).fill({ color: M.hillLight, alpha: 0.5 })
  board.addChild(g)
}

function _pine(board: Container, x: number, groundY: number, h: number, color: number) {
  const g = new Graphics()
  const w = h * 0.55
  g.poly([x, groundY-h,       x-w*0.5, groundY-h*0.5,  x+w*0.5, groundY-h*0.5]).fill(color)
  g.poly([x, groundY-h*0.65, x-w*0.65, groundY-h*0.3,  x+w*0.65, groundY-h*0.3]).fill(color)
  g.poly([x, groundY-h*0.42, x-w*0.78, groundY-h*0.08, x+w*0.78, groundY-h*0.08]).fill(color)
  g.rect(x - h*0.055, groundY - h*0.08, h*0.11, h*0.08).fill(0x5C3A1E)
  board.addChild(g)
}

function _palm(board: Container, x: number, groundY: number, h: number) {
  const g = new Graphics()
  for (let i = 0; i < 5; i++) {
    const ty = groundY - h * (i / 5)
    const tx = x + i * h * 0.04
    g.rect(tx - h*0.045 - 1, ty - h/5 - 1, h*0.09 + 2, h/5 + 3).fill(0x000000)
    g.rect(tx - h*0.045, ty - h/5, h*0.09, h/5 + 1).fill(0x8B6914)
  }
  const topX = x + h * 0.2, topY = groundY - h
  g.circle(topX, topY, h*0.22).fill(0x2A6A10)
  for (const [angle, len] of [[-0.4,h*0.5],[0.1,h*0.55],[0.6,h*0.44],[-0.9,h*0.38],[1.0,h*0.4]] as [number,number][]) {
    const ex = topX + Math.cos(angle) * len, ey = topY + Math.sin(angle) * len * 0.45
    g.poly([topX, topY, topX + 4, topY + 3, ex + 4, ey + 3, ex, ey]).fill(0x3A8A1A)
    void ey
  }
  board.addChild(g)
}

// ─── Main viewer factory ──────────────────────────────────────────────────────

export function createPlatformerViewer(): GameViewer<GauntletInit, GauntletFrame> {
  let board:       Container      | null = null
  let token:       AnimatedSprite | null = null
  let obstacleGfx: Graphics       | null = null
  let appW = 0
  let appH = 0
  let savedInit: GauntletInit | null = null

  // Rebuilds all static scene elements from scratch (sync). Called on setup and resize.
  function buildScene(app: Application) {
    if (!board || !savedInit) return
    appW = app.screen.width
    appH = app.screen.height
    obstacleGfx = null

    // Detach token before clearing, then re-attach on top after rebuild.
    if (token) board.removeChild(token)
    board.removeChildren()

    const init      = savedInit
    const groundY   = appH * 0.72
    const blockSize = appH * 0.14
    const theme     = THEMES[PROBLEM_THEME[init.problemType] ?? 'plains']

    // Sky
    board.addChild(new Graphics().rect(0, 0, appW, groundY * 0.65).fill(theme.skyTop))
    board.addChild(new Graphics().rect(0, groundY * 0.65, appW, groundY * 0.35).fill({ color: theme.skyBot, alpha: 0.9 }))

    // Theme background elements
    theme.drawBg(board, appW, appH, groundY, blockSize)

    // Ground base
    board.addChild(new Graphics().rect(0, groundY, appW, appH - groundY).fill(theme.ground))

    // Brick texture on ground
    const brickH = blockSize * 0.32
    const brickW = blockSize * 0.85
    for (let row = 0; row < 3; row++) {
      const rowY   = groundY + row * brickH
      const offset = (row % 2) * brickW * 0.5
      for (let col = -1; col < appW / brickW + 1; col++) {
        const bx = col * brickW + offset
        board.addChild(new Graphics()
          .rect(bx + 1, rowY + 1, brickW - 2, brickH - 2)
          .fill({ color: 0x000000, alpha: 0.12 }))
      }
    }
    board.addChild(new Graphics().rect(0, groundY, appW, 3).fill({ color: 0x000000, alpha: 0.35 }))

    // Obstacles
    const blocks: GauntletBlock[] = init.blocks ?? [{
      problemType: init.problemType,
      x:           init.obstacleX,
      cleared:     false,
    }]

    for (let i = 0; i < blocks.length; i++) {
      const blk       = blocks[i]
      const bx        = appW * blk.x
      const isCurrent = i === (init.currentBlock ?? 0)

      const g = new Graphics()
      if (blk.cleared) {
        g.circle(bx, groundY - blockSize*0.12, blockSize*0.22).fill({ color: 0x888888, alpha: 0.35 })
      } else {
        theme.drawObstacle(g, bx, groundY, blockSize)
      }
      board.addChild(g)
      if (isCurrent) obstacleGfx = g
    }

    // Flag
    const poleX = appW * 0.95
    const poleH = blockSize * 3.0
    board.addChild(new Graphics().rect(poleX - 2, groundY - poleH, 5, poleH).fill(0x8B6914))
    board.addChild(new Graphics()
      .poly([poleX+3, groundY-poleH, poleX+blockSize*0.58, groundY-poleH+blockSize*0.4, poleX+3, groundY-poleH+blockSize*0.8])
      .fill(0x11A84F))

    // Re-attach token on top with updated size
    if (token) {
      token.width  = blockSize * 0.95
      token.height = blockSize * 0.95
      board.addChild(token)
    }
  }

  return {
    async setup(app: Application, init: GauntletInit) {
      savedInit = init
      board = new Container()
      app.stage.addChild(board)

      buildScene(app)

      // Cameleon (async asset load — done after buildScene so token lands on top)
      const groundY   = appH * 0.72
      const blockSize = appH * 0.14
      const sheet = await Assets.load<Texture>(SHEET)
      const walk: Texture[] = []
      for (let c = 0; c < WALK_FRAMES; c++)
        walk.push(new Texture({ source: sheet.source, frame: new Rectangle(c * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE) }))
      token = new AnimatedSprite(walk)
      token.anchor.set(0.5, 1)
      token.animationSpeed = 0.15
      token.play()
      token.width    = blockSize * 0.95
      token.height   = blockSize * 0.95
      token.rotation = FACE_RIGHT
      token.position.set(appW * 0.05, groundY)
      board.addChild(token)
    },

    resize(app: Application) {
      buildScene(app)
    },

    renderFrame(frame: GauntletFrame, t: number, prev: GauntletFrame | null) {
      if (!token || !savedInit) return

      const groundY   = appH * 0.72
      const blockSize = appH * 0.14
      const jumpH     = blockSize * JUMP_H_RATIO

      const fromX = prev?.cameleonX ?? frame.cameleonX
      const fromY = prev?.cameleonY ?? frame.cameleonY
      const cx    = fromX + (frame.cameleonX - fromX) * t
      const cy    = fromY + (frame.cameleonY - fromY) * t

      const N       = savedInit.blocks?.length ?? 1
      const idx     = savedInit.currentBlock ?? 0
      const screenX = appW * 0.03 + (idx / N + cx / N) * appW * 0.94

      token.position.set(screenX, groundY + cy * jumpH)

      if (frame.event === 'hit' || frame.event === 'dead') {
        token.tint = 0xff3333
        if (obstacleGfx) obstacleGfx.tint = 0xff5522
      } else if (frame.event === 'goal') {
        token.tint = M.coin
        if (obstacleGfx) obstacleGfx.tint = 0xffffff
      } else {
        token.tint = 0xffffff
        if (obstacleGfx) obstacleGfx.tint = 0xffffff
      }

      if (frame.event === 'jump' || frame.event === 'fall') {
        if (token.playing) token.stop()
      } else if (!token.playing) {
        token.play()
      }
    },

    teardown() {
      board?.destroy({ children: true })
      board = null; token = null; obstacleGfx = null; savedInit = null
    },
  }
}
