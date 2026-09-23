import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import { clamp01, easeOutCubic, glowInto, lerp, phase, rng, smooth, verticalGradient } from '../viewerKit'
import type { TrafficFrame, TrafficInit } from './types'

const COLOR = {
  skyTop: 0x6ec3f5,
  skyLow: 0xdff4ff,
  sun: 0xfff3b0,
  cloud: 0xffffff,
  hillFar: 0x9fd8a8,
  hillNear: 0x6fbf7e,
  house: 0xf3e3c8,
  roof: 0xd9725b,
  window: 0x8fc9ef,
  trunk: 0x8a5a36,
  leaves: 0x3fa45b,
  leavesLight: 0x5cc174,
  curb: 0xc9ccd3,
  sidewalk: 0xe4e1da,
  road: 0x4a4f5c,
  roadEdge: 0x3a3e49,
  dash: 0xf4f4f0,
  grass: 0x7ccf72,
  pole: 0x2d313b,
  housing: 0x1f232b,
  car: 0x2f7fed,
  carDark: 0x215fb8,
  glass: 0xbfe6ff,
  tyre: 0x1c1d22,
  hub: 0xb9bec8,
  headlight: 0xfff2b3,
  brake: 0xff3b3b,
  ok: 0x22c55e,
  ko: 0xef4444,
  ink: 0x1e293b,
  panel: 0xffffff,
}

const LAMP: Record<string, { on: number; off: number; slot: number }> = {
  ROUGE: { on: 0xff3b30, off: 0x4a1e1e, slot: 0 },
  ORANGE: { on: 0xffa51f, off: 0x4a3418, slot: 1 },
  VERT: { on: 0x2ee66b, off: 0x173f25, slot: 2 },
}

const EXPECTED: Record<string, string> = { VERT: 'PASSE', ORANGE: 'RALENTIS', ROUGE: 'STOP' }

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

// Monde en coordonnées « logiques » (hauteur fixe NAT_H), mis à l'échelle de la hauteur du canvas.
const NAT_H = 300
const TOP = 64 // bande réservée en haut de l'écran aux pastilles
const SPACING = 380 // distance entre deux feux
const FIRST = 300 // abscisse du premier feu
const CAR_L = 116
const START_X = 70
const AFTER = 150 // la voiture s'arrête sa frame finie, un peu après le feu
const STOP_GAP = 70 // ligne d'arrêt, avant le feu
const ROAD_TOP = 182
const ROAD_BOTTOM = 262
const LANE_Y = 252 // roues de la voiture

/** Mouvement de la voiture sur une frame : position + freinage (feux stop allumés). */
interface Motion {
  x: number
  braking: boolean
}

/**
 * Viewer de la Route des feux : une rue vue de côté, caméra qui suit la voiture.
 *
 * Chaque frame traite un feu. Le mouvement dépend de l'ordre donné : PASSE file droit,
 * RALENTIS lève le pied à l'approche, STOP freine jusqu'à la ligne, attend que le feu
 * passe au vert, puis redémarre. Une infraction est mise en scène (gyrophare, message).
 */
export function createTrafficViewer(): GameViewer<TrafficInit, TrafficFrame> {
  let root: Container | null = null
  let skyG: Graphics | null = null
  let cloudsG: Graphics | null = null
  let hillsC: Container | null = null
  let housesC: Container | null = null
  let world: Container | null = null
  let lampsG: Graphics | null = null
  let car: Container | null = null
  let wheels: Graphics[] = []
  let brakeG: Graphics | null = null
  let bubble: Text | null = null
  let fxG: Graphics | null = null
  let alarmG: Graphics | null = null
  let chipsC: Container | null = null
  let chips: { dot: Graphics; label: Text }[] = []
  let panelG: Graphics | null = null
  let titleText: Text | null = null
  let detailText: Text | null = null
  let tick: ((ticker: Ticker) => void) | null = null

  let initRef: TrafficInit | null = null
  let W = 0
  let H = 0
  let s = 1 // échelle logique → écran
  let time = 0
  let alarm = false
  let chipW = 40
  let clouds: { x: number; y: number; r: number; speed: number }[] = []

  const n = () => initRef?.lights.length ?? 0
  const LX = (i: number) => FIRST + i * SPACING
  const stopX = (i: number) => LX(i) - STOP_GAP - CAR_L / 2
  const A = (i: number) => (i <= 0 ? START_X : LX(i - 1) + AFTER)
  const B = (i: number) => LX(i) + AFTER
  const finishX = () => LX(Math.max(0, n() - 1)) + SPACING * 0.85
  const worldEnd = () => finishX() + 260

  // --- Mouvement de la voiture ----------------------------------------------------------

  const motionFor = (frame: TrafficFrame, t: number): Motion => {
    const i = frame.light
    const ev = frame.event
    if (ev === 'start') return { x: START_X, braking: false }
    if (ev === 'arrived') {
      const from = n() > 0 ? B(n() - 1) : START_X
      return { x: lerp(from, finishX() + 40, easeOutCubic(t)), braking: t > 0.75 }
    }
    if (ev === 'extra') {
      const from = n() > 0 ? B(n() - 1) : START_X
      return { x: lerp(from, finishX() - CAR_L, easeOutCubic(t)), braking: t > 0.5 }
    }

    const a = A(i)
    const order = frame.order ?? ''
    if (ev === 'drive') {
      if (order === 'STOP') {
        // Freine jusqu'à la ligne, attend le vert, puis repart.
        if (t < 0.42) return { x: lerp(a, stopX(i), easeOutCubic(t / 0.42)), braking: true }
        if (t < 0.72) return { x: stopX(i), braking: true }
        const k = phase(t, 0.72, 1)
        return { x: lerp(stopX(i), B(i), k * k), braking: false }
      }
      if (order === 'RALENTIS') {
        // Vitesse qui fléchit à l'approche du feu puis reprend.
        const g = t + (0.7 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI)
        return { x: lerp(a, B(i), g), braking: t > 0.2 && t < 0.6 }
      }
      return { x: lerp(a, B(i), t), braking: false }
    }

    // Erreurs : la voiture exécute l'ordre donné… et s'arrête là.
    if (order === 'PASSE') return { x: lerp(a, LX(i) + 90, easeOutCubic(t)), braking: t > 0.55 }
    if (order === 'RALENTIS') return { x: lerp(a, LX(i) + 60, smooth(t)), braking: t > 0.3 }
    return { x: lerp(a, stopX(i), easeOutCubic(t)), braking: true }
  }

  /** Couleur affichée par le feu j pendant cette frame. */
  const lampColor = (j: number, frame: TrafficFrame, t: number): string => {
    const base = initRef?.lights[j] ?? 'VERT'
    if (j < frame.light) return base === 'ROUGE' ? 'VERT' : base // on a attendu le vert
    if (j === frame.light && frame.event === 'drive' && base === 'ROUGE') return t < 0.64 ? 'ROUGE' : 'VERT'
    return base
  }

  // --- Décor ------------------------------------------------------------------------------

  const tree = (g: Graphics, x: number, baseY: number, h: number, rnd: () => number) => {
    g.rect(x - h * 0.05, baseY - h * 0.45, h * 0.1, h * 0.46).fill(COLOR.trunk)
    const r = h * 0.3
    g.circle(x, baseY - h * 0.62, r).fill(COLOR.leaves)
    g.circle(x - r * 0.6, baseY - h * 0.5, r * 0.75).fill(COLOR.leaves)
    g.circle(x + r * 0.62, baseY - h * 0.52, r * 0.7).fill(COLOR.leaves)
    g.circle(x - r * 0.25, baseY - h * 0.74, r * 0.55).fill({ color: COLOR.leavesLight, alpha: 0.8 })
    if (rnd() < 0.5) g.circle(x + r * 0.3, baseY - h * 0.6, r * 0.12).fill(0xff6b6b) // un fruit
  }

  const house = (g: Graphics, x: number, baseY: number, w: number, h: number, rnd: () => number) => {
    g.rect(x, baseY - h, w, h).fill(COLOR.house)
    g.poly([x - w * 0.08, baseY - h, x + w * 1.08, baseY - h, x + w / 2, baseY - h - w * 0.45]).fill(COLOR.roof)
    const cols = Math.max(1, Math.round(w / 34))
    for (let c = 0; c < cols; c++) {
      const wx = x + ((c + 0.5) * w) / cols - 7
      if (rnd() < 0.85) g.roundRect(wx, baseY - h * 0.72, 14, 14, 2).fill(COLOR.window)
    }
    g.rect(x + w * 0.42, baseY - h * 0.38, w * 0.16, h * 0.38).fill(0xa0694a)
  }

  const buildWorld = () => {
    if (!world || !lampsG || !car || !brakeG || !hillsC || !housesC || !initRef) return
    const rnd = rng(4242)
    const end = worldEnd()

    // Collines lointaines (parallaxe 0,3) et maisons (parallaxe 0,6).
    hillsC.removeChildren().forEach((c) => c.destroy())
    const hills = new Graphics()
    for (const [color, base, amp, freq] of [
      [COLOR.hillFar, 132, 34, 0.004],
      [COLOR.hillNear, 150, 22, 0.007],
    ] as [number, number, number, number][]) {
      hills.moveTo(-200, NAT_H)
      for (let x = -200; x <= end * 0.4 + 1600; x += 20) {
        hills.lineTo(x, base - (Math.sin(x * freq) * 0.6 + Math.sin(x * freq * 2.3 + 1) * 0.4) * amp)
      }
      hills.lineTo(end * 0.4 + 1600, NAT_H).closePath().fill(color)
    }
    hillsC.addChild(hills)

    housesC.removeChildren().forEach((c) => c.destroy())
    const houses = new Graphics()
    for (let x = -120; x < end * 0.65 + 1400; x += 150 + rnd() * 140) {
      house(houses, x, 170, 70 + rnd() * 40, 42 + rnd() * 28, rnd)
    }
    housesC.addChild(houses)

    // Premier plan : trottoirs, chaussée, marquages, arbres, ligne d'arrivée.
    world.removeChildren()
    const ground = new Graphics()
    ground.rect(-400, 166, end + 800, ROAD_TOP - 166).fill(COLOR.sidewalk)
    ground.rect(-400, ROAD_TOP - 4, end + 800, 4).fill(COLOR.curb)
    ground.rect(-400, ROAD_TOP, end + 800, ROAD_BOTTOM - ROAD_TOP).fill(COLOR.road)
    ground.rect(-400, ROAD_BOTTOM - 3, end + 800, 3).fill(COLOR.roadEdge)
    ground.rect(-400, ROAD_BOTTOM, end + 800, 14).fill(COLOR.sidewalk)
    ground.rect(-400, ROAD_BOTTOM, end + 800, 3).fill(COLOR.curb)
    ground.rect(-400, ROAD_BOTTOM + 14, end + 800, NAT_H).fill(COLOR.grass)
    for (let x = -400; x < end + 400; x += 64) ground.rect(x, 220, 34, 4).fill({ color: COLOR.dash, alpha: 0.85 })
    world.addChild(ground)

    const trees = new Graphics()
    for (let x = 40; x < end; x += 110 + rnd() * 120) {
      const near = initRef.lights.some((_, j) => Math.abs(x - LX(j)) < 60) || Math.abs(x - finishX()) < 90
      if (!near) tree(trees, x, 172, 60 + rnd() * 30, rnd)
    }
    world.addChild(trees)

    // Lignes d'arrêt + poteaux des feux (les lampes sont redessinées à chaque frame).
    const poles = new Graphics()
    initRef.lights.forEach((_, j) => {
      const x = LX(j)
      poles.rect(x - STOP_GAP - 4, 224, 8, ROAD_BOTTOM - 226).fill({ color: COLOR.dash, alpha: 0.95 })
      poles.ellipse(x, 178, 16, 4).fill({ color: 0x000000, alpha: 0.2 })
      poles.rect(x - 3.5, 100, 7, 78).fill(COLOR.pole)
      poles.roundRect(x - 17, 22, 34, 86, 8).fill(COLOR.housing)
      poles.roundRect(x - 17, 22, 34, 86, 8).stroke({ color: 0x0d0f13, width: 2 })
      for (let k = 0; k < 3; k++) poles.rect(x - 15, 31 + k * 26 - 3, 30, 3).fill({ color: 0x000000, alpha: 0.35 }) // visières
    })
    world.addChild(poles)
    world.addChild(lampsG)

    // Arche d'arrivée en damier.
    const fx = finishX()
    const arch = new Graphics()
    arch.rect(fx - 6, 60, 10, 120).fill(COLOR.pole)
    arch.rect(fx + 140, 60, 10, 202).fill(COLOR.pole)
    const sq = 12
    for (let c = 0; c < 13; c++) {
      for (let r = 0; r < 2; r++) {
        arch.rect(fx + c * sq, 48 + r * sq, sq, sq).fill((c + r) % 2 === 0 ? 0x111111 : 0xffffff)
      }
    }
    world.addChild(arch)
    const finishLabel = new Text({
      text: 'ARRIVÉE',
      style: new TextStyle({ fontFamily: FONT, fontSize: 16, fontWeight: '900', fill: COLOR.ink }),
    })
    finishLabel.anchor.set(0.5, 1)
    finishLabel.position.set(fx + 75, 44)
    world.addChild(finishLabel)

    // Voiture : origine au sol, entre les roues.
    car.removeChildren().forEach((c) => c.destroy())
    wheels = []
    const body = new Graphics()
    body.ellipse(0, 2, CAR_L * 0.5, 7).fill({ color: 0x000000, alpha: 0.25 })
    body.roundRect(-CAR_L / 2, -38, CAR_L, 28, 10).fill(COLOR.car)
    body.poly([-36, -38, -22, -60, 22, -60, 40, -38]).fill(COLOR.car)
    body.poly([-31, -40, -20, -56, -3, -56, -3, -40]).fill(COLOR.glass)
    body.poly([3, -40, 3, -56, 19, -56, 33, -40]).fill(COLOR.glass)
    body.rect(-CAR_L / 2, -22, CAR_L, 3).fill({ color: COLOR.carDark, alpha: 0.9 })
    body.roundRect(CAR_L / 2 - 8, -33, 8, 7, 2).fill(COLOR.headlight)
    body.roundRect(-CAR_L / 2, -33, 6, 8, 2).fill(0x8c1d1d)
    car.addChild(body)
    car.addChild(brakeG)
    for (const wx of [-34, 34]) {
      const w = new Graphics()
      w.circle(0, 0, 12).fill(COLOR.tyre)
      w.circle(0, 0, 6).fill(COLOR.hub)
      w.rect(-1.5, -10, 3, 20).fill({ color: COLOR.tyre, alpha: 0.9 })
      w.position.set(wx, -10)
      car.addChild(w)
      wheels.push(w)
    }
    world.addChild(car)
  }

  const buildScreen = () => {
    if (!skyG || !chipsC || !initRef) return
    skyG.clear()
    verticalGradient(skyG, 0, 0, W, H, COLOR.skyTop, COLOR.skyLow, 40)
    glowInto(skyG, W * 0.86, H * 0.14, Math.min(W, H) * 0.32, COLOR.sun, 0.75)
    skyG.circle(W * 0.86, H * 0.14, Math.min(W, H) * 0.06).fill(COLOR.sun)

    const rnd = rng(77)
    clouds = []
    for (let i = 0; i < 5; i++) {
      clouds.push({ x: rnd() * W, y: H * (0.06 + rnd() * 0.22), r: Math.min(W, H) * (0.035 + rnd() * 0.03), speed: 6 + rnd() * 10 })
    }

    // Pastilles : un feu par pastille, l'ordre donné s'affiche dessous.
    chipsC.removeChildren().forEach((c) => c.destroy())
    chips = []
    const count = initRef.lights.length
    const gap = Math.max(6, W * 0.012)
    const cw = Math.max(34, Math.min(W * 0.11, (W * 0.92) / Math.max(1, count) - gap))
    const total = count * cw + (count - 1) * gap
    initRef.lights.forEach((_, j) => {
      const x = W / 2 - total / 2 + j * (cw + gap)
      const dot = new Graphics()
      dot.position.set(x, H * 0.035)
      const label = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: Math.max(9, Math.min(13, cw * 0.17)), fontWeight: '800', fill: COLOR.ink }),
      })
      label.anchor.set(0.5, 0)
      label.position.set(x + cw / 2, H * 0.035 + Math.min(26, H * 0.06) + 4)
      chipsC!.addChild(dot, label)
      chips.push({ dot, label })
    })
    chipW = cw
  }

  // --- Peintres par frame -------------------------------------------------------------

  const paintLamps = (frame: TrafficFrame, t: number) => {
    if (!lampsG || !initRef) return
    lampsG.clear()
    initRef.lights.forEach((_, j) => {
      const shown = lampColor(j, frame, t)
      for (const key of ['ROUGE', 'ORANGE', 'VERT']) {
        const lamp = LAMP[key]
        const y = 39 + lamp.slot * 26
        const on = key === shown
        if (on) glowInto(lampsG!, LX(j), y, 26, lamp.on, 0.75)
        lampsG!.circle(LX(j), y, 9.5).fill(on ? lamp.on : lamp.off)
        if (on) lampsG!.circle(LX(j) - 3, y - 3, 3).fill({ color: 0xffffff, alpha: 0.6 })
      }
      // Éclat quand le feu rouge passe au vert devant la voiture arrêtée.
      if (j === frame.light && frame.event === 'drive' && initRef!.lights[j] === 'ROUGE') {
        const f = phase(t, 0.62, 0.74)
        if (f > 0 && f < 1) glowInto(lampsG!, LX(j), 39 + 2 * 26, 70, LAMP.VERT.on, 0.6 * Math.sin(f * Math.PI))
      }
    })
  }

  const paintChips = (frame: TrafficFrame, t: number) => {
    if (!initRef) return
    const h = Math.min(26, H * 0.06)
    chips.forEach((chip, j) => {
      const color = initRef!.lights[j]
      const lamp = LAMP[color] ?? LAMP.VERT
      const done = j < frame.light || frame.event === 'arrived' || frame.event === 'extra'
      const current = j === frame.light && frame.event !== 'start'
      const bad = current && (frame.event === 'wrong' || frame.event === 'missing')
      const good = done || (current && frame.event === 'drive' && t > 0.5)
      chip.dot.clear()
      chip.dot
        .roundRect(0, 0, chipW, h, h / 2)
        .fill({ color: 0xffffff, alpha: 0.82 })
        .stroke({ color: bad ? COLOR.ko : good ? COLOR.ok : 0x94a3b8, width: bad || good ? 2.5 : 1.5 })
      chip.dot.circle(h / 2, h / 2, h * 0.3).fill(lamp.on)
      let label = ''
      let fill = COLOR.ink
      if (good) {
        label = EXPECTED[color] ?? ''
        fill = 0x15803d
      } else if (bad) {
        label = frame.event === 'missing' ? '…' : (frame.order ?? '?')
        fill = COLOR.ko
      }
      chip.label.text = label
      chip.label.style.fill = fill
      chip.label.alpha = current && !bad ? phase(t, 0.4, 0.6) : 1
    })
  }

  const showPanel = (title: string, detail: string, color: number, k: number) => {
    if (!panelG || !titleText || !detailText) return
    panelG.clear()
    titleText.alpha = detailText.alpha = k
    panelG.alpha = k
    if (k <= 0) return
    titleText.text = title
    titleText.style.fill = color
    detailText.style.wordWrap = true
    detailText.style.wordWrapWidth = Math.max(160, W * 0.84)
    detailText.style.align = 'center'
    detailText.text = detail
    const pw = Math.max(titleText.width, detailText.width) + 44
    const ph = titleText.height + detailText.height + 28
    const px = W / 2 - pw / 2
    const py = H * 0.2
    panelG.roundRect(px, py, pw, ph, 14).fill({ color: COLOR.panel, alpha: 0.94 }).stroke({ color, width: 3 })
    titleText.position.set(W / 2, py + 12)
    detailText.position.set(W / 2, py + 16 + titleText.height)
  }

  // --- Ambiance -----------------------------------------------------------------------

  const ambient = (dt: number) => {
    time += dt
    const sec = time / 1000
    if (cloudsG) {
      cloudsG.clear()
      for (const c of clouds) {
        const x = ((c.x + sec * c.speed) % (W + c.r * 6)) - c.r * 3
        cloudsG.circle(x, c.y, c.r).fill({ color: COLOR.cloud, alpha: 0.9 })
        cloudsG.circle(x + c.r * 0.9, c.y + c.r * 0.2, c.r * 0.8).fill({ color: COLOR.cloud, alpha: 0.9 })
        cloudsG.circle(x - c.r * 0.9, c.y + c.r * 0.25, c.r * 0.7).fill({ color: COLOR.cloud, alpha: 0.9 })
      }
    }
    if (alarmG) {
      alarmG.clear()
      if (alarm) {
        const blink = Math.sin(sec * 9) > 0
        glowInto(alarmG, 0, 0, Math.min(W, H) * 0.45, blink ? 0xff2d2d : 0x2d6bff, 0.55)
        glowInto(alarmG, W, 0, Math.min(W, H) * 0.45, blink ? 0x2d6bff : 0xff2d2d, 0.55)
        alarmG.rect(0, 0, W, H).fill({ color: 0xff0000, alpha: 0.05 + 0.04 * Math.sin(sec * 9) })
      }
    }
  }

  const layout = (app: Application) => {
    W = app.screen.width
    H = app.screen.height
    s = H / (NAT_H + TOP)
    for (const c of [world, hillsC, housesC]) {
      c?.scale.set(s)
      if (c) c.y = TOP * s
    }
    buildScreen()
  }

  return {
    setup(app: Application, init: TrafficInit) {
      initRef = init
      root = new Container()
      app.stage.addChild(root)
      skyG = new Graphics()
      cloudsG = new Graphics()
      hillsC = new Container()
      housesC = new Container()
      world = new Container()
      lampsG = new Graphics()
      car = new Container()
      brakeG = new Graphics()
      fxG = new Graphics()
      alarmG = new Graphics()
      chipsC = new Container()
      panelG = new Graphics()
      titleText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 22, fontWeight: '900', fill: COLOR.ko }),
      })
      titleText.anchor.set(0.5, 0)
      detailText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 15, fontWeight: '600', fill: COLOR.ink }),
      })
      detailText.anchor.set(0.5, 0)
      bubble = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 30, fontWeight: '900', fill: COLOR.ink }),
      })
      bubble.anchor.set(0.5, 1)
      root.addChild(skyG, cloudsG, hillsC, housesC, world, fxG, alarmG, chipsC, panelG, titleText, detailText)
      layout(app)
      buildWorld()
      world.addChild(bubble)

      tick = (ticker: Ticker) => ambient(ticker.deltaMS)
      app.ticker.add(tick)
    },

    resize(app: Application) {
      layout(app)
    },

    renderFrame(frame: TrafficFrame, t: number) {
      if (!world || !car || !brakeG || !hillsC || !housesC || !fxG || !bubble || !initRef) return
      const motion = motionFor(frame, t)

      // Caméra : la voiture reste vers le tiers gauche de l'écran.
      const viewW = W / s
      const camX = Math.max(-40, Math.min(worldEnd() - viewW, motion.x - viewW * 0.38))
      world.x = -camX * s
      hillsC.x = -camX * s * 0.3
      housesC.x = -camX * s * 0.6

      car.position.set(motion.x, LANE_Y)
      for (const w of wheels) w.rotation = motion.x / 12
      brakeG.clear()
      if (motion.braking) {
        glowInto(brakeG, -CAR_L / 2, -29, 22, COLOR.brake, 0.9)
        brakeG.roundRect(-CAR_L / 2, -33, 6, 8, 2).fill(COLOR.brake)
      }

      paintLamps(frame, t)
      paintChips(frame, t)

      // Bulle au-dessus de la voiture (hésitation / ordre manquant).
      bubble.text = ''
      if (frame.event === 'missing') bubble.text = '…'
      else if (frame.event === 'wrong' && !['PASSE', 'RALENTIS', 'STOP'].includes(frame.order ?? '')) bubble.text = '?'
      bubble.position.set(motion.x, LANE_Y - 70)
      bubble.alpha = phase(t, 0.5, 0.8)

      // Messages et effets.
      alarm = false
      fxG.clear()
      const k = phase(t, 0.55, 0.85)
      const color = frame.color ?? ''
      if (frame.event === 'wrong') {
        alarm = t > 0.5
        const known = ['PASSE', 'RALENTIS', 'STOP'].includes(frame.order ?? '')
        showPanel(
          known ? 'Infraction !' : 'Ordre inconnu',
          known
            ? `Feu ${color} : il fallait ${frame.expected}, pas ${frame.order}`
            : `« ${frame.order} » n'existe pas. Au feu ${color}, l'ordre est ${frame.expected}`,
          COLOR.ko,
          k,
        )
      } else if (frame.event === 'missing') {
        showPanel('En panne d’ordres', `Aucun ordre pour le feu ${color} (il fallait ${frame.expected})`, COLOR.ko, k)
      } else if (frame.event === 'extra') {
        showPanel('Ordre en trop', `Plus aucun feu, mais le programme écrit encore « ${frame.order} »`, COLOR.ko, k)
      } else if (frame.event === 'arrived') {
        showPanel('Bien arrivé !', 'Tous les feux ont été respectés', COLOR.ok, phase(t, 0.6, 0.9))
        // Confettis qui tombent de l'arche.
        const rnd = rng(9)
        const fall = easeOutCubic(phase(t, 0.55, 1))
        for (let i = 0; i < 70; i++) {
          // Chaque confetti part d'une hauteur différente au-dessus de l'écran : à la fin,
          // la pluie couvre toute la hauteur au lieu de s'entasser en bas.
          const x0 = rnd() * W
          const y0 = -H * (0.05 + rnd() * 0.7)
          const y1 = H * (0.35 + rnd() * 0.6)
          const sway = Math.sin(fall * 9 + i) * 10
          const c = [0xffd23f, 0xff6b6b, 0x4dabf7, 0x51cf66, 0xcc5de8][i % 5]
          const w = 5 + (i % 3)
          fxG
            .rect(x0 + sway, lerp(y0, y1, fall), w, w * 1.7)
            .fill({ color: c, alpha: clamp01(fall * 4) })
        }
      } else {
        showPanel('', '', COLOR.ink, 0)
      }

      // Léger tangage de la carrosserie au freinage.
      car.rotation = motion.braking && frame.event === 'drive' ? -0.012 * Math.sin(Math.min(1, t * 3) * Math.PI) : 0
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      skyG = cloudsG = lampsG = brakeG = fxG = alarmG = panelG = null
      hillsC = housesC = world = car = chipsC = null
      titleText = detailText = bubble = null
      wheels = []
      chips = []
      clouds = []
      initRef = null
    },
  }
}
