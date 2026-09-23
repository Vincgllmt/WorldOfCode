import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import {
  clamp01,
  easeOutBack,
  easeOutCubic,
  glowInto,
  lerp,
  mixColor,
  phase,
  rng,
  smooth,
  verticalGradient,
} from '../viewerKit'
import type { CountdownFrame, CountdownInit } from './types'

const COLOR = {
  skyTop: 0x060924,
  skyLow: 0x3b1c4f, // lueur orangée de la ville sur l'horizon
  star: 0xf4f1ff,
  cityFar: 0x221b48,
  cityNear: 0x110e28,
  window: 0xffcf6b,
  ground: 0x08071a,
  crowd: 0x03030b,
  tube: 0x343a58,
  tubeBand: 0x58608a,
  crate: 0x5b3b22,
  crateEdge: 0x3a2414,
  shell: 0xe23b4c,
  shellDark: 0xa82536,
  stripe: 0xf2c14e,
  fuse: 0xc79b5c,
  fuseBurnt: 0x4a3c34,
  spark: 0xffd166,
  digit: 0xfff4d6,
  feu: 0xff8a3d,
  ko: 0xff5a5f,
  muted: 0xb9b4d6,
  pillIdle: 0x241f4f,
  pillEdge: 0x4a4388,
  pillDone: 0xf2c14e,
  pillText: 0xe9e5ff,
  pillTextDone: 0x2b1d05,
  smoke: 0xa3a6bd,
}

/** Palettes d'explosion : [cœur lumineux, couleur des éclats]. */
const PALETTES: [number, number][] = [
  [0xfff0a8, 0xff5d73],
  [0xc8f7ff, 0x4f8bff],
  [0xe4ffb0, 0x34d27b],
  [0xffd1f5, 0xb35cff],
  [0xfff6c2, 0xffa53d],
]

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

interface Star {
  g: Graphics
  base: number
  speed: number
  phase: number
}

/**
 * Viewer du Grand Feu d'artifice.
 *
 * Toute la scène est dessinée en coordonnées écran et reconstruite au resize. Le replay
 * pilote la mèche (elle brûle d'une annonce à l'autre), le chiffre géant, le décollage
 * et les salves ; un ticker propre fait scintiller les étoiles, crépiter l'étincelle de
 * la mèche, monter la fumée d'un raté et sautiller la foule pendant le spectacle.
 */
export function createCountdownViewer(): GameViewer<CountdownInit, CountdownFrame> {
  let root: Container | null = null
  let skyG: Graphics | null = null
  let starsC: Container | null = null
  let flashG: Graphics | null = null
  let fxG: Graphics | null = null
  let cityG: Graphics | null = null
  let fuseG: Graphics | null = null
  let sparkG: Graphics | null = null
  let trailG: Graphics | null = null
  let rocket: Container | null = null
  let launcherG: Graphics | null = null
  let smokeG: Graphics | null = null
  let crowdG: Graphics | null = null
  let ringG: Graphics | null = null
  let pillsC: Container | null = null
  let bigText: Text | null = null
  let subText: Text | null = null

  let initRef: CountdownInit | null = null
  let stars: Star[] = []
  let pills: { box: Graphics; label: Text; w: number; h: number }[] = []
  let crowd: { x: number; s: number; phase: number }[] = []
  let tick: ((ticker: Ticker) => void) | null = null

  let W = 0
  let H = 0
  let time = 0
  // État lu par le ticker (fixé par renderFrame).
  let sparkAt: { x: number; y: number } | null = null
  let smokeAt: { x: number; y: number } | null = null
  let celebrating = false

  /** Mesures de la scène, dérivées de la taille du canvas. */
  let M = {
    unit: 1,
    horizon: 0,
    tubeX: 0,
    tubeTop: 0,
    tubeBase: 0,
    tubeW: 0,
    rocketH: 0,
    restY: 0,
    apexY: 0,
    digitY: 0,
  }

  const recompute = () => {
    const unit = Math.min(W, H * 1.6) / 100
    const horizon = H * 0.83
    const tubeW = Math.max(18, unit * 4.2)
    const tubeBase = horizon + (H - horizon) * 0.42
    const tubeTop = tubeBase - Math.max(34, H * 0.1)
    const rocketH = Math.max(36, H * 0.11)
    M = {
      unit,
      horizon,
      tubeX: W * 0.5,
      tubeTop,
      tubeBase,
      tubeW,
      rocketH,
      restY: tubeTop + rocketH * 0.42,
      apexY: H * 0.34,
      digitY: H * 0.43,
    }
  }

  // --- Mèche : courbe de Bézier posée au sol, du bord gauche jusqu'au pied du tube ---

  const fusePoint = (u: number) => {
    const x0 = W * 0.5 - Math.min(W * 0.32, H * 0.55)
    const y0 = M.tubeBase + (H - M.tubeBase) * 0.25
    const x2 = M.tubeX - M.tubeW * 0.5
    const y2 = M.tubeBase - 3
    const x1 = lerp(x0, x2, 0.55)
    const y1 = y0 + (H - M.tubeBase) * 0.55
    const a = (1 - u) * (1 - u)
    const b = 2 * (1 - u) * u
    const c = u * u
    return { x: a * x0 + b * x1 + c * x2, y: a * y0 + b * y1 + c * y2 }
  }

  const drawFuse = (burnt: number) => {
    if (!fuseG) return
    fuseG.clear()
    const SAMPLES = 60
    const cut = Math.round(clamp01(burnt) * SAMPLES)
    const width = Math.max(2.5, M.unit * 0.75)
    // Partie consumée : cendre sombre et fine.
    if (cut > 0) {
      const p = fusePoint(0)
      fuseG.moveTo(p.x, p.y)
      for (let i = 1; i <= cut; i++) {
        const q = fusePoint(i / SAMPLES)
        fuseG.lineTo(q.x, q.y)
      }
      fuseG.stroke({ color: COLOR.fuseBurnt, width: width * 0.6, alpha: 0.85, cap: 'round' })
    }
    // Partie restante : cordon tressé.
    if (cut < SAMPLES) {
      const p = fusePoint(cut / SAMPLES)
      fuseG.moveTo(p.x, p.y)
      for (let i = cut + 1; i <= SAMPLES; i++) {
        const q = fusePoint(i / SAMPLES)
        fuseG.lineTo(q.x, q.y)
      }
      fuseG.stroke({ color: COLOR.fuse, width, cap: 'round' })
      for (let i = cut + 1; i < SAMPLES; i += 3) {
        const q = fusePoint(i / SAMPLES)
        fuseG.circle(q.x, q.y, width * 0.32).fill({ color: 0x000000, alpha: 0.18 })
      }
    }
  }

  // --- Décor ---------------------------------------------------------------------------

  const buildScene = () => {
    if (!skyG || !starsC || !cityG || !launcherG || !rocket || !pillsC || !initRef) return
    const rnd = rng(1789)

    skyG.clear()
    verticalGradient(skyG, 0, 0, W, M.horizon + 2, COLOR.skyTop, COLOR.skyLow, 56)
    glowInto(skyG, W * 0.5, M.horizon, Math.max(W, H) * 0.55, 0xff8a5c, 0.16)

    // Étoiles, plus nombreuses en haut du ciel.
    starsC.removeChildren().forEach((c) => c.destroy())
    stars = []
    const count = Math.round((W * H) / 9000) + 30
    for (let i = 0; i < count; i++) {
      const x = rnd() * W
      const y = Math.pow(rnd(), 1.6) * M.horizon * 0.85
      const r = rnd() < 0.08 ? 1.6 : 0.6 + rnd() * 0.8
      const g = new Graphics().circle(0, 0, r).fill(COLOR.star)
      g.position.set(x, y)
      starsC.addChild(g)
      stars.push({ g, base: 0.35 + rnd() * 0.6, speed: 0.6 + rnd() * 2.2, phase: rnd() * Math.PI * 2 })
    }

    // Ville : deux rangées d'immeubles, la plus proche avec des fenêtres allumées.
    cityG.clear()
    const skyline = (color: number, minH: number, maxH: number, minW: number, maxW: number, windows: boolean) => {
      let x = -rnd() * maxW
      while (x < W) {
        const bw = lerp(minW, maxW, rnd())
        const bh = lerp(minH, maxH, Math.pow(rnd(), 1.3))
        const top = M.horizon - bh
        cityG!.rect(x, top, bw + 1, bh + 2).fill(color)
        if (rnd() < 0.25) cityG!.rect(x + bw * 0.4, top - bh * 0.12, bw * 0.12, bh * 0.12).fill(color) // antenne
        if (windows) {
          const cell = Math.max(5, M.unit * 1.25)
          for (let wy = top + cell; wy < M.horizon - cell; wy += cell * 1.5) {
            for (let wx = x + cell * 0.6; wx < x + bw - cell; wx += cell * 1.3) {
              if (rnd() < 0.3) {
                cityG!.rect(wx, wy, cell * 0.55, cell * 0.7).fill({ color: COLOR.window, alpha: 0.35 + rnd() * 0.5 })
              }
            }
          }
        }
        x += bw + rnd() * maxW * 0.15
      }
    }
    skyline(COLOR.cityFar, H * 0.1, H * 0.3, W * 0.04, W * 0.09, false)
    skyline(COLOR.cityNear, H * 0.05, H * 0.2, W * 0.05, W * 0.11, true)
    cityG.rect(0, M.horizon, W, H - M.horizon).fill(COLOR.ground)
    cityG.rect(0, M.horizon, W, Math.max(2, M.unit * 0.4)).fill({ color: 0xff9a6b, alpha: 0.12 })

    // Tube de lancement (devant la fusée) posé sur une caisse.
    launcherG.clear()
    const { tubeX, tubeTop, tubeBase, tubeW } = M
    const crateW = tubeW * 2.6
    const crateH = tubeW * 0.9
    launcherG.roundRect(tubeX - crateW / 2, tubeBase - crateH * 0.35, crateW, crateH, 3).fill(COLOR.crate)
    launcherG
      .roundRect(tubeX - crateW / 2, tubeBase - crateH * 0.35, crateW, crateH, 3)
      .stroke({ color: COLOR.crateEdge, width: 2 })
    launcherG.rect(tubeX - crateW / 2, tubeBase + crateH * 0.12, crateW, 2).fill({ color: COLOR.crateEdge, alpha: 0.8 })
    launcherG.roundRect(tubeX - tubeW / 2, tubeTop, tubeW, tubeBase - tubeTop, 3).fill(COLOR.tube)
    launcherG.rect(tubeX - tubeW / 2, tubeTop + 4, tubeW, 4).fill(COLOR.tubeBand)
    launcherG.rect(tubeX - tubeW / 2, tubeBase - 12, tubeW, 4).fill(COLOR.tubeBand)
    launcherG.rect(tubeX + tubeW * 0.18, tubeTop, tubeW * 0.12, tubeBase - tubeTop).fill({ color: 0xffffff, alpha: 0.07 })
    launcherG.ellipse(tubeX, tubeTop, tubeW / 2, tubeW * 0.16).fill(0x15182a)

    // Fusée : obus rouge à rayures dorées, origine au pied.
    rocket.removeChildren().forEach((c) => c.destroy())
    const h = M.rocketH
    const w = h * 0.36
    const body = new Graphics()
    body.poly([-w * 0.5, -h * 0.05, -w * 0.95, h * 0.02, -w * 0.5, -h * 0.3]).fill(COLOR.shellDark) // aileron gauche
    body.poly([w * 0.5, -h * 0.05, w * 0.95, h * 0.02, w * 0.5, -h * 0.3]).fill(COLOR.shellDark) // aileron droit
    body.roundRect(-w / 2, -h * 0.72, w, h * 0.72, w * 0.2).fill(COLOR.shell)
    body.rect(-w / 2, -h * 0.56, w, h * 0.07).fill(COLOR.stripe)
    body.rect(-w / 2, -h * 0.3, w, h * 0.07).fill(COLOR.stripe)
    body.rect(w * 0.12, -h * 0.7, w * 0.14, h * 0.66).fill({ color: 0xffffff, alpha: 0.16 })
    body.poly([-w / 2, -h * 0.72, w / 2, -h * 0.72, 0, -h]).fill(COLOR.stripe)
    rocket.addChild(body)

    // Foule : silhouettes au premier plan.
    crowd = []
    const step = Math.max(14, M.unit * 3.2)
    for (let x = rnd() * step; x < W; x += step * (0.7 + rnd() * 0.6)) {
      // On laisse dégagés la mèche et le pas de tir : c'est là que se lit la progression.
      if (x > fusePoint(0).x - step && x < M.tubeX + M.tubeW * 2.2) continue
      crowd.push({ x, s: 0.8 + rnd() * 0.45, phase: rnd() * Math.PI * 2 })
    }

    // Pastilles du décompte, en haut de l'écran.
    pillsC.removeChildren().forEach((c) => c.destroy())
    pills = []
    const seq = initRef.sequence
    const gap = Math.max(4, M.unit * 0.8)
    const pw = Math.max(18, Math.min(M.unit * 7.5, (W * 0.9) / seq.length - gap))
    const ph = Math.max(16, Math.min(pw * 0.62, H * 0.075))
    const total = seq.length * pw + (seq.length - 1) * gap
    seq.forEach((label, i) => {
      const box = new Graphics()
      box.position.set(W / 2 - total / 2 + i * (pw + gap), H * 0.06)
      const isFeu = label === 'FEU'
      const width = isFeu ? pw * 1.35 : pw
      const text = new Text({
        text: label,
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: Math.max(10, ph * 0.52),
          fontWeight: '800',
          fill: COLOR.pillText,
        }),
      })
      text.anchor.set(0.5)
      text.position.set(box.x + width / 2, box.y + ph / 2)
      pillsC!.addChild(box, text)
      pills.push({ box, label: text, w: width, h: ph })
    })
    // Recentre en tenant compte de la pastille FEU plus large.
    const realW = pills.reduce((acc, p) => acc + p.w, 0) + (pills.length - 1) * gap
    let cursor = W / 2 - realW / 2
    for (const p of pills) {
      p.box.x = cursor
      p.label.x = cursor + p.w / 2
      cursor += p.w + gap
    }

    if (bigText) bigText.style.fontSize = Math.min(H * 0.25, W * 0.2)
    if (subText) subText.style.fontSize = Math.max(13, Math.min(H * 0.05, W * 0.035))
  }

  // --- Explosions ----------------------------------------------------------------------

  /** Une gerbe : éclats rayonnants qui ralentissent, tombent et s'éteignent. */
  const burst = (cx: number, cy: number, p: number, palette: [number, number], seed: number) => {
    if (!fxG || p <= 0 || p >= 1) return
    const rnd = rng(seed)
    const R = Math.min(W, H) * 0.2
    const spread = easeOutCubic(p)
    const fall = p * p * H * 0.07
    const fade = 1 - Math.pow(p, 2.2)
    const [core, edge] = palette

    if (p < 0.35) glowInto(fxG, cx, cy, R * (0.45 + p), core, 0.5 * (1 - p / 0.35))

    const count = 46
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.12
      const speed = 0.72 + rnd() * 0.32
      const r = R * spread * speed
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r + fall
      const tx = cx + Math.cos(angle) * r * 0.78
      const ty = cy + Math.sin(angle) * r * 0.78 + fall * 0.8
      const color = mixColor(core, edge, clamp01(p * 1.3 + (i % 2) * 0.25))
      fxG.moveTo(tx, ty).lineTo(x, y).stroke({ color, width: Math.max(1.2, M.unit * 0.32), alpha: fade * 0.75 })
      fxG.circle(x, y, Math.max(1.4, M.unit * 0.42) * (1 - p * 0.5)).fill({ color, alpha: fade })
      // Paillettes qui crépitent en fin de gerbe.
      if (p > 0.45 && rnd() < 0.5) {
        const sx = cx + Math.cos(angle) * r * (0.55 + rnd() * 0.3)
        const sy = cy + Math.sin(angle) * r * (0.55 + rnd() * 0.3) + fall
        fxG.circle(sx, sy, Math.max(0.8, M.unit * 0.2)).fill({ color: 0xffffff, alpha: fade * (0.4 + rnd() * 0.6) })
      }
    }
  }

  // --- HUD ------------------------------------------------------------------------------

  const paintPills = (frame: CountdownFrame, t: number) => {
    const ev = frame.event
    pills.forEach((p, i) => {
      let fill = COLOR.pillIdle
      let edge = COLOR.pillEdge
      let alpha = 1
      let text = COLOR.pillText
      const justDone = i === frame.step - 1 && (ev === 'tick' || ev === 'launch')
      if (i < frame.step) {
        const k = justDone ? smooth(phase(t, 0, 0.5)) : 1
        fill = mixColor(COLOR.pillIdle, COLOR.pillDone, k)
        edge = mixColor(COLOR.pillEdge, 0xfff1c4, k)
        text = mixColor(COLOR.pillText, COLOR.pillTextDone, k)
      } else if (i === frame.step && (ev === 'wrong' || ev === 'fizzle')) {
        fill = mixColor(COLOR.pillIdle, COLOR.ko, ev === 'wrong' ? 0.85 : 0.35)
        edge = COLOR.ko
        text = 0xffffff
      } else {
        alpha = 0.85
      }
      p.box.clear()
      p.box.roundRect(0, 0, p.w, p.h, p.h / 2).fill({ color: fill, alpha })
      p.box.roundRect(0, 0, p.w, p.h, p.h / 2).stroke({ color: edge, width: 1.5, alpha })
      p.label.style.fill = text
    })
  }

  const setBig = (text: string, color: number, scale: number, alpha: number, dx = 0) => {
    if (!bigText) return
    bigText.text = text
    bigText.style.fill = color
    bigText.scale.set(scale)
    bigText.alpha = alpha
    bigText.position.set(W / 2 + dx, M.digitY)
  }

  const setSub = (text: string, color: number, alpha = 1) => {
    if (!subText) return
    subText.text = text
    subText.style.fill = color
    subText.alpha = alpha
    const hasBig = !!bigText && bigText.text !== '' && bigText.alpha > 0
    subText.position.set(W / 2, hasBig ? M.digitY + bigText!.height / 2 + H * 0.03 : M.digitY - subText.height / 2)
  }

  // --- Ticker d'ambiance -----------------------------------------------------------------

  const ambient = (dt: number) => {
    time += dt
    const s = time / 1000
    for (const st of stars) st.g.alpha = st.base * (0.55 + 0.45 * Math.sin(s * st.speed + st.phase))

    if (sparkG) {
      sparkG.clear()
      if (sparkAt) {
        const flick = 0.75 + Math.random() * 0.5
        glowInto(sparkG, sparkAt.x, sparkAt.y, M.unit * 3.2 * flick, COLOR.spark, 0.9)
        sparkG.circle(sparkAt.x, sparkAt.y, M.unit * 0.6 * flick).fill(0xffffff)
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2
          const r = M.unit * (0.8 + Math.random() * 2.4)
          sparkG
            .circle(sparkAt.x + Math.cos(a) * r, sparkAt.y + Math.sin(a) * r - M.unit * 0.6, M.unit * 0.22)
            .fill({ color: Math.random() < 0.5 ? COLOR.spark : 0xffffff, alpha: 0.9 })
        }
      }
    }

    if (smokeG) {
      smokeG.clear()
      if (smokeAt) {
        for (let i = 0; i < 6; i++) {
          const life = ((s * 0.35 + i / 6) % 1 + 1) % 1
          const x = smokeAt.x + Math.sin(s * 0.8 + i * 1.7) * M.unit * 1.5 * life
          const y = smokeAt.y - life * H * 0.12
          smokeG.circle(x, y, M.unit * (1.2 + life * 3.2)).fill({ color: COLOR.smoke, alpha: 0.32 * (1 - life) })
        }
      }
    }

    if (crowdG) {
      crowdG.clear()
      for (const c of crowd) {
        const hop = celebrating ? Math.abs(Math.sin(s * 5 + c.phase)) * M.unit * 1.3 : 0
        const size = M.unit * 1.5 * c.s
        const baseY = H + size * 0.2 - hop
        crowdG.roundRect(c.x - size * 1.1, baseY - size * 1.6, size * 2.2, size * 2.4, size * 0.9).fill(COLOR.crowd)
        crowdG.circle(c.x, baseY - size * 2.15, size * 0.85).fill(COLOR.crowd)
        if (celebrating && Math.sin(c.phase * 3) > -0.2) {
          crowdG
            .moveTo(c.x - size * 0.9, baseY - size * 1.2)
            .lineTo(c.x - size * 1.5, baseY - size * 3.1 - hop * 0.3)
            .moveTo(c.x + size * 0.9, baseY - size * 1.2)
            .lineTo(c.x + size * 1.5, baseY - size * 3.1 - hop * 0.3)
            .stroke({ color: COLOR.crowd, width: size * 0.5, cap: 'round' })
        }
      }
    }
  }

  return {
    setup(app: Application, init: CountdownInit) {
      initRef = init
      W = app.screen.width
      H = app.screen.height
      recompute()

      root = new Container()
      app.stage.addChild(root)
      skyG = new Graphics()
      starsC = new Container()
      flashG = new Graphics()
      fxG = new Graphics()
      cityG = new Graphics()
      fuseG = new Graphics()
      sparkG = new Graphics()
      trailG = new Graphics()
      rocket = new Container()
      launcherG = new Graphics()
      smokeG = new Graphics()
      crowdG = new Graphics()
      ringG = new Graphics()
      pillsC = new Container()
      bigText = new Text({
        text: '',
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 80,
          fontWeight: '900',
          fill: COLOR.digit,
          dropShadow: { color: 0x000000, alpha: 0.6, blur: 12, distance: 0, angle: 0 },
        }),
      })
      bigText.anchor.set(0.5)
      subText = new Text({
        text: '',
        style: new TextStyle({
          fontFamily: FONT,
          fontSize: 18,
          fontWeight: '700',
          fill: COLOR.muted,
          dropShadow: { color: 0x000000, alpha: 0.7, blur: 6, distance: 0, angle: 0 },
        }),
      })
      subText.anchor.set(0.5, 0)

      root.addChild(
        skyG,
        starsC,
        flashG,
        fxG,
        cityG,
        fuseG,
        sparkG,
        trailG,
        rocket,
        launcherG,
        smokeG,
        crowdG,
        ringG,
        pillsC,
        bigText,
        subText,
      )
      buildScene()

      tick = (ticker: Ticker) => ambient(ticker.deltaMS)
      app.ticker.add(tick)
    },

    resize(app: Application) {
      W = app.screen.width
      H = app.screen.height
      recompute()
      buildScene()
    },

    renderFrame(frame: CountdownFrame, t: number, prev: CountdownFrame | null) {
      if (!initRef || !rocket || !trailG || !fxG || !flashG || !ringG) return
      const total = Math.max(1, initRef.sequence.length)
      const ev = frame.event

      // Mèche : elle se consume d'une annonce juste à la suivante.
      const from = prev ? prev.step : frame.step
      const burnK = ev === 'tick' ? smooth(t) : ev === 'launch' ? smooth(phase(t, 0, 0.25)) : 1
      const burnt = lerp(from, frame.step, burnK) / total
      drawFuse(burnt)
      sparkAt = ev === 'tick' || (ev === 'launch' && t < 0.25) ? fusePoint(burnt) : null

      celebrating = ev === 'burst' || ev === 'finale'
      smokeAt =
        ev === 'wrong' || ev === 'fizzle'
          ? fusePoint(burnt)
          : ev === 'extra'
            ? { x: M.tubeX, y: M.apexY + H * 0.05 }
            : null

      // Fusée : au repos sur le tube, puis décollage en accélérant.
      trailG.clear()
      rocket.visible = true
      rocket.alpha = 1
      rocket.rotation = 0
      if (ev === 'launch') {
        const k = phase(t, 0.25, 1)
        const y = lerp(M.restY, M.apexY, Math.pow(k, 1.7))
        const x = M.tubeX + Math.sin(k * Math.PI * 3) * M.unit * 0.6
        rocket.position.set(x, y)
        rocket.rotation = Math.sin(k * Math.PI * 3) * 0.05
        if (k > 0) {
          // Traînée d'étincelles sous la fusée.
          const len = Math.min(H * 0.3, M.restY - y)
          for (let i = 0; i < 26; i++) {
            const u = i / 26
            const py = y + u * len
            const px = x + Math.sin(u * 19 + k * 9) * M.unit * (0.4 + u * 1.6)
            trailG.circle(px, py, M.unit * (0.5 - u * 0.35)).fill({ color: u < 0.3 ? 0xffffff : COLOR.spark, alpha: 1 - u })
          }
          glowInto(trailG, x, y, M.unit * 4, COLOR.feu, 0.8)
        }
      } else if (ev === 'burst' || ev === 'finale') {
        rocket.visible = false
      } else if (ev === 'extra') {
        // La fusée arrivée en haut fait long feu : pas d'explosion, elle retombe.
        rocket.position.set(M.tubeX, M.apexY + easeOutCubic(t) * H * 0.1)
        rocket.alpha = 1 - t
        rocket.rotation = t * 0.9
      } else {
        rocket.position.set(M.tubeX, M.restY)
      }

      // Explosions : une gerbe, puis deux, puis le bouquet final.
      fxG.clear()
      flashG.clear()
      let flash = 0
      if (ev === 'burst' && frame.wave === 1) {
        burst(M.tubeX, M.apexY, t, PALETTES[0], 11)
        flash = Math.max(flash, 1 - phase(t, 0, 0.25))
      } else if (ev === 'burst') {
        burst(W * 0.28, H * 0.38, phase(t, 0, 0.85), PALETTES[1], 23)
        burst(W * 0.72, H * 0.33, phase(t, 0.15, 1), PALETTES[2], 37)
        flash = Math.max(flash, 1 - phase(t, 0, 0.2), 0.8 * (1 - phase(t, 0.15, 0.35)))
      } else if (ev === 'finale') {
        const spots: [number, number][] = [
          [0.2, 0.36],
          [0.5, 0.3],
          [0.8, 0.36],
          [0.35, 0.48],
          [0.65, 0.46],
        ]
        spots.forEach(([fx, fy], i) => {
          const start = i * 0.1
          burst(W * fx, H * fy, phase(t, start, start + 0.6), PALETTES[i % PALETTES.length], 51 + i * 7)
        })
        flash = 0.7 * (1 - phase(t, 0, 0.5))
      }
      if (flash > 0) flashG.rect(0, 0, W, M.horizon).fill({ color: 0xffd9b0, alpha: 0.13 * flash })

      // Chiffre géant + anneau qui pulse.
      ringG.clear()
      const pop = easeOutBack(phase(t, 0, 0.45))
      if (ev === 'ready') {
        setBig('', COLOR.digit, 1, 0)
        setSub(`Compte à rebours depuis ${initRef.n}`, COLOR.muted)
      } else if (ev === 'tick') {
        setBig(frame.shown ?? '', COLOR.digit, lerp(1.55, 1, pop), phase(t, 0, 0.2))
        setSub('', COLOR.muted, 0)
        const r = (bigText?.height ?? H * 0.2) * (0.55 + t * 0.55)
        ringG.circle(W / 2, M.digitY, r).stroke({ color: COLOR.stripe, width: 3, alpha: 0.55 * (1 - t) })
      } else if (ev === 'launch') {
        setBig('FEU !', COLOR.feu, lerp(1.6, 1, pop), 1 - phase(t, 0.3, 0.55))
        setSub('', COLOR.muted, 0)
      } else if (ev === 'burst') {
        setBig('', COLOR.digit, 1, 0)
        setSub('', COLOR.muted, 0)
      } else if (ev === 'finale') {
        setBig('BRAVO !', COLOR.stripe, lerp(1.4, 1, easeOutBack(phase(t, 0.25, 0.7))), phase(t, 0.25, 0.45))
        setSub('Le ciel est en fête', COLOR.digit, phase(t, 0.45, 0.7))
      } else if (ev === 'wrong') {
        const shake = Math.sin(t * 48) * (1 - phase(t, 0, 0.6)) * M.unit * 1.6
        setBig(frame.shown ?? '?', COLOR.ko, lerp(1.3, 1, pop), 1, shake)
        setSub(`Attendu : ${frame.expected ?? ''}`, COLOR.digit, phase(t, 0.3, 0.6))
      } else if (ev === 'fizzle') {
        setBig('…', COLOR.muted, 1, phase(t, 0, 0.3))
        setSub(`La mèche s'éteint : il manquait « ${frame.expected ?? ''} »`, COLOR.digit, phase(t, 0.2, 0.5))
      } else if (ev === 'extra') {
        setBig('Pschitt…', COLOR.muted, 0.7, phase(t, 0, 0.3))
        setSub(`Ligne en trop après FEU : « ${frame.shown ?? ''} »`, COLOR.digit, phase(t, 0.2, 0.5))
      }

      paintPills(frame, t)
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      skyG = starsC = null
      flashG = fxG = cityG = fuseG = sparkG = trailG = launcherG = smokeG = crowdG = ringG = null
      rocket = pillsC = null
      bigText = subText = null
      initRef = null
      stars = []
      pills = []
      crowd = []
      sparkAt = smokeAt = null
    },
  }
}
