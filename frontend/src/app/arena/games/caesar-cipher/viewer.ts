import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import { easeInOutCubic, easeOutBack, glowInto, phase, rng, verticalGradient } from '../viewerKit'
import type { CaesarFrame, CaesarInit } from './types'

const COLOR = {
  deskTop: 0x3b2517,
  deskLow: 0x1c1109,
  grain: 0x6a4630,
  lamp: 0xffd9a0,
  paper: 0xf4e7c5,
  paperEdge: 0xcdb486,
  ink: 0x2b2118,
  inkDim: 0x9c8b6e,
  ok: 0x1d7a3c,
  ko: 0xd0312d,
  brass: 0xc9a24b,
  brassDark: 0x8a6a2a,
  brassLight: 0xeccf86,
  disc: 0x24334f,
  discEdge: 0x16203a,
  discText: 0xe9eefb,
  pointer: 0xff5a4f,
  note: 0xffe27a,
  noteInk: 0x4a3b10,
  mote: 0xffe9c2,
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const TYPE = '"Courier New", Courier, ui-monospace, monospace'
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const STEP = (Math.PI * 2) / 26

interface Tile {
  index: number // position dans le message
  word: number
  posInWord: number
  wordLen: number
  cipher: Text
  plain: Text
  fix: Text
}

/**
 * Viewer du Message secret : un bureau d'espion sous une lampe.
 *
 * À gauche, une roue de chiffrement : le disque extérieur porte l'alphabet en clair, le
 * disque intérieur l'alphabet chiffré ; il tourne jusqu'au bon décalage. À droite, le
 * message intercepté : chaque lettre chiffrée a sa case, et la réponse du joueur s'y
 * dévoile mot par mot (lettre fausse en rouge, corrigée en vert à la fin).
 */
export function createCaesarViewer(): GameViewer<CaesarInit, CaesarFrame> {
  let root: Container | null = null
  let deskG: Graphics | null = null
  let motesG: Graphics | null = null
  let paperG: Graphics | null = null
  let tilesC: Container | null = null
  let wheelC: Container | null = null
  let innerC: Container | null = null
  let centerText: Text | null = null
  let noteC: Container | null = null
  let stampC: Container | null = null
  let stampG: Graphics | null = null
  let stampText: Text | null = null
  let scoreText: Text | null = null
  let tiles: Tile[] = []
  let tick: ((ticker: Ticker) => void) | null = null

  let initRef: CaesarInit | null = null
  let W = 0
  let H = 0
  let time = 0
  let motes: { x: number; y: number; r: number; speed: number; phase: number }[] = []

  let L = {
    wheelX: 0,
    wheelY: 0,
    R: 0,
    paperX: 0,
    paperY: 0,
    paperW: 0,
    paperH: 0,
    tile: 0,
  }

  const recompute = () => {
    const wide = W >= H * 1.2
    if (wide) {
      const R = Math.min(W * 0.17, H * 0.31)
      L = {
        wheelX: W * 0.2,
        wheelY: H * 0.42,
        R,
        paperX: W * 0.39,
        paperY: H * 0.07,
        paperW: W * 0.58,
        paperH: H * 0.86,
        tile: 0,
      }
    } else {
      const R = Math.min(W * 0.26, H * 0.17)
      L = {
        wheelX: W * 0.3,
        wheelY: H * 0.22,
        R,
        paperX: W * 0.05,
        paperY: H * 0.44,
        paperW: W * 0.9,
        paperH: H * 0.53,
        tile: 0,
      }
    }
  }

  // --- Décor -------------------------------------------------------------------------

  const buildDesk = () => {
    if (!deskG) return
    const rnd = rng(31337)
    deskG.clear()
    verticalGradient(deskG, 0, 0, W, H, COLOR.deskTop, COLOR.deskLow, 40)
    // Veinage du bois : lignes sinueuses très discrètes.
    for (let i = 0; i < 22; i++) {
      const y0 = rnd() * H
      const amp = 4 + rnd() * 10
      const f = 0.004 + rnd() * 0.01
      deskG.moveTo(0, y0)
      for (let x = 0; x <= W; x += 16) deskG.lineTo(x, y0 + Math.sin(x * f + i) * amp)
      deskG.stroke({ color: COLOR.grain, width: 1 + rnd() * 1.5, alpha: 0.18 })
    }
    // Lumière de la lampe de bureau, centrée sur la feuille.
    glowInto(deskG, L.paperX + L.paperW * 0.5, L.paperY + L.paperH * 0.35, Math.max(W, H) * 0.7, COLOR.lamp, 0.38)

    motes = []
    for (let i = 0; i < 26; i++) {
      motes.push({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.4, speed: 4 + rnd() * 8, phase: rnd() * 6 })
    }
  }

  const buildPaper = () => {
    if (!paperG || !tilesC || !initRef) return
    const { paperX: x, paperY: y, paperW: w, paperH: h } = L
    paperG.clear()
    paperG.roundRect(x + 6, y + 8, w, h, 6).fill({ color: 0x000000, alpha: 0.35 })
    paperG.roundRect(x, y, w, h, 6).fill(COLOR.paper)
    paperG.roundRect(x, y, w, h, 6).stroke({ color: COLOR.paperEdge, width: 2 })
    // Lignes de cahier très légères.
    for (let ly = y + h * 0.2; ly < y + h - 10; ly += h * 0.09) {
      paperG.rect(x + 12, ly, w - 24, 1).fill({ color: COLOR.paperEdge, alpha: 0.35 })
    }

    tilesC.removeChildren().forEach((c) => c.destroy())
    tiles = []

    const header = new Text({
      text: 'MESSAGE INTERCEPTÉ',
      style: new TextStyle({ fontFamily: TYPE, fontSize: Math.max(10, h * 0.045), fontWeight: '700', fill: COLOR.ink, letterSpacing: 2 }),
    })
    header.anchor.set(0.5, 0)
    header.position.set(x + w / 2, y + h * 0.04)
    tilesC.addChild(header)

    // Découpe en mots (avec leur position dans le message), puis retour à la ligne :
    // on cherche le plus petit nombre de caractères par ligne qui tient dans la feuille,
    // ce qui donne les cases les plus grandes possibles.
    const cipher = initRef.cipher
    const words: { start: number; text: string }[] = []
    let i = 0
    while (i < cipher.length) {
      if (cipher[i] === ' ') {
        i++
        continue
      }
      const start = i
      while (i < cipher.length && cipher[i] !== ' ') i++
      words.push({ start, text: cipher.slice(start, i) })
    }
    const innerW = w * 0.9
    const top = y + h * 0.16
    const innerH = h * 0.7
    const longest = words.reduce((m, wd) => Math.max(m, wd.text.length), 1)
    let lines: { start: number; text: string; word: number }[][] = []
    let tw = 0
    for (let per = Math.max(longest, 8); per <= 40; per++) {
      const candidate: { start: number; text: string; word: number }[][] = [[]]
      let used = 0
      words.forEach((wd, wi) => {
        const need = (used > 0 ? 1 : 0) + wd.text.length
        if (used > 0 && used + need > per) {
          candidate.push([])
          used = 0
        }
        candidate[candidate.length - 1].push({ ...wd, word: wi })
        used += (used > 0 ? 1 : 0) + wd.text.length
      })
      const size = innerW / per
      if (candidate.length * size * 1.95 <= innerH || per === 40) {
        lines = candidate
        tw = Math.min(size, innerH / (candidate.length * 1.95))
        break
      }
    }
    L.tile = tw
    const th = tw * 1.6

    const small = new TextStyle({ fontFamily: TYPE, fontSize: Math.max(8, tw * 0.42), fontWeight: '700', fill: COLOR.inkDim })
    lines.forEach((line, li) => {
      const chars = line.reduce((n, wd, k) => n + wd.text.length + (k > 0 ? 1 : 0), 0)
      let cx = x + w / 2 - (chars * tw) / 2
      const cy = top + li * th * 1.22
      line.forEach((wd, k) => {
        if (k > 0) cx += tw
        for (let c = 0; c < wd.text.length; c++) {
          const ch = wd.text[c]
          const cipherT = new Text({ text: ch, style: small })
          cipherT.anchor.set(0.5, 0)
          cipherT.position.set(cx + tw / 2, cy)
          const plain = new Text({
            text: '·',
            style: new TextStyle({ fontFamily: TYPE, fontSize: Math.max(10, tw * 0.78), fontWeight: '700', fill: COLOR.ink }),
          })
          plain.anchor.set(0.5)
          plain.position.set(cx + tw / 2, cy + th * 0.66)
          const fix = new Text({
            text: initRef!.expected[wd.start + c] ?? '',
            style: new TextStyle({ fontFamily: TYPE, fontSize: Math.max(8, tw * 0.4), fontWeight: '700', fill: COLOR.ok }),
          })
          fix.anchor.set(0.5, 0)
          fix.position.set(cx + tw / 2, cy + th * 1.0)
          fix.visible = false
          // Petite ligne de saisie sous chaque case.
          const line = new Graphics().rect(cx + tw * 0.14, cy + th * 0.98, tw * 0.72, 1.4).fill({ color: COLOR.inkDim, alpha: 0.6 })
          tilesC!.addChild(line, cipherT, plain, fix)
          tiles.push({
            index: wd.start + c,
            word: wd.word,
            posInWord: c,
            wordLen: wd.text.length,
            cipher: cipherT,
            plain,
            fix,
          })
          cx += tw
        }
      })
    })

    if (scoreText) {
      scoreText.style.fontSize = Math.max(9, h * 0.036)
      scoreText.style.wordWrap = true
      scoreText.style.wordWrapWidth = w * 0.9
      scoreText.style.align = 'center'
      scoreText.position.set(x + w / 2, y + h * 0.095)
    }
    if (stampText) stampText.style.fontSize = Math.max(14, Math.min(w * 0.075, h * 0.1))
  }

  const buildWheel = () => {
    if (!wheelC || !innerC || !noteC || !centerText || !initRef) return
    const R = L.R
    // On garde le disque intérieur et le texte central (réutilisés), on détruit le reste.
    for (const c of wheelC.removeChildren()) if (c !== innerC && c !== centerText) c.destroy({ children: true })
    innerC.removeChildren().forEach((c) => c.destroy())
    wheelC.position.set(L.wheelX, L.wheelY)

    // Disque extérieur en laiton : l'alphabet en clair.
    const outer = new Graphics()
    outer.circle(4, 6, R).fill({ color: 0x000000, alpha: 0.4 })
    outer.circle(0, 0, R).fill(COLOR.brass)
    outer.circle(0, 0, R).stroke({ color: COLOR.brassDark, width: 3 })
    outer.circle(0, 0, R * 0.73).fill(COLOR.brassDark)
    for (let j = 0; j < 26; j++) {
      const a = j * STEP - Math.PI / 2 + STEP / 2
      outer
        .moveTo(Math.cos(a) * R * 0.73, Math.sin(a) * R * 0.73)
        .lineTo(Math.cos(a) * R, Math.sin(a) * R)
        .stroke({ color: COLOR.brassDark, width: 1, alpha: 0.7 })
    }
    wheelC.addChild(outer)
    const outerStyle = new TextStyle({ fontFamily: TYPE, fontSize: Math.max(8, R * 0.13), fontWeight: '700', fill: 0x3a2a0c })
    for (let j = 0; j < 26; j++) {
      const a = j * STEP - Math.PI / 2
      const letter = new Text({ text: ALPHA[j], style: outerStyle })
      letter.anchor.set(0.5)
      letter.position.set(Math.cos(a) * R * 0.865, Math.sin(a) * R * 0.865)
      letter.rotation = a + Math.PI / 2
      wheelC.addChild(letter)
    }

    // Disque intérieur : l'alphabet chiffré, qui tourne.
    const disc = new Graphics()
    disc.circle(0, 0, R * 0.71).fill(COLOR.disc)
    disc.circle(0, 0, R * 0.71).stroke({ color: COLOR.discEdge, width: 3 })
    disc.circle(0, 0, R * 0.42).fill(COLOR.discEdge)
    innerC.addChild(disc)
    const innerStyle = new TextStyle({ fontFamily: TYPE, fontSize: Math.max(8, R * 0.12), fontWeight: '700', fill: COLOR.discText })
    for (let j = 0; j < 26; j++) {
      const a = j * STEP - Math.PI / 2
      const letter = new Text({ text: ALPHA[j], style: innerStyle })
      letter.anchor.set(0.5)
      letter.position.set(Math.cos(a) * R * 0.57, Math.sin(a) * R * 0.57)
      letter.rotation = a + Math.PI / 2
      innerC.addChild(letter)
    }
    wheelC.addChild(innerC)

    // Fenêtre de lecture en haut + pointeur.
    const marker = new Graphics()
    marker
      .roundRect(-R * 0.09, -R * 1.0, R * 0.18, R * 0.62, R * 0.05)
      .stroke({ color: COLOR.pointer, width: 2.5 })
    marker.poly([-R * 0.09, -R * 1.12, R * 0.09, -R * 1.12, 0, -R * 1.0]).fill(COLOR.pointer)
    wheelC.addChild(marker)

    const cap = new Graphics()
    cap.circle(0, 0, R * 0.3).fill(COLOR.brassLight)
    cap.circle(0, 0, R * 0.3).stroke({ color: COLOR.brassDark, width: 2 })
    wheelC.addChild(cap)
    centerText.style.fontSize = Math.max(10, R * 0.16)
    centerText.position.set(0, 0)
    wheelC.addChild(centerText)

    // Post-it de l'indice sous la roue.
    noteC.removeChildren().forEach((c) => c.destroy())
    const nw = Math.max(R * 1.5, 90)
    const nh = R * 0.55
    noteC.position.set(L.wheelX, L.wheelY + R + nh * 0.75)
    noteC.rotation = -0.04
    const note = new Graphics()
    note.rect(-nw / 2 + 3, -nh / 2 + 5, nw, nh).fill({ color: 0x000000, alpha: 0.3 })
    note.rect(-nw / 2, -nh / 2, nw, nh).fill(COLOR.note)
    note.rect(-nw / 2, -nh / 2, nw, nh * 0.18).fill({ color: 0xffffff, alpha: 0.25 })
    noteC.addChild(note)
    const label = new Text({
      text: 'INDICE',
      style: new TextStyle({ fontFamily: FONT, fontSize: Math.max(8, nh * 0.2), fontWeight: '800', fill: COLOR.noteInk }),
    })
    label.anchor.set(0.5, 0)
    label.position.set(0, -nh * 0.42)
    const word = new Text({
      text: initRef.hint,
      style: new TextStyle({ fontFamily: TYPE, fontSize: Math.max(10, nh * 0.36), fontWeight: '700', fill: COLOR.noteInk }),
    })
    word.anchor.set(0.5, 0)
    word.position.set(0, -nh * 0.12)
    noteC.addChild(label, word)
  }

  // --- Ambiance ---------------------------------------------------------------------

  const ambient = (dt: number) => {
    time += dt
    const s = time / 1000
    if (!motesG) return
    motesG.clear()
    for (const m of motes) {
      const x = (m.x + Math.sin(s * 0.3 + m.phase) * 20 + W) % W
      const y = (m.y - s * m.speed + H * 10) % H
      motesG.circle(x, y, m.r).fill({ color: COLOR.mote, alpha: 0.25 + 0.2 * Math.sin(s * 2 + m.phase) })
    }
  }

  return {
    setup(app: Application, init: CaesarInit) {
      initRef = init
      W = app.screen.width
      H = app.screen.height
      recompute()

      root = new Container()
      app.stage.addChild(root)
      deskG = new Graphics()
      motesG = new Graphics()
      paperG = new Graphics()
      tilesC = new Container()
      wheelC = new Container()
      innerC = new Container()
      noteC = new Container()
      stampC = new Container()
      stampG = new Graphics()
      centerText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: TYPE, fontSize: 14, fontWeight: '700', fill: 0x3a2a0c, align: 'center' }),
      })
      centerText.anchor.set(0.5)
      stampText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 30, fontWeight: '900', fill: COLOR.ok, letterSpacing: 3 }),
      })
      stampText.anchor.set(0.5)
      stampC.addChild(stampG, stampText)
      stampC.rotation = -0.16
      scoreText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 13, fontWeight: '700', fill: COLOR.ink }),
      })
      scoreText.anchor.set(0.5, 0)
      root.addChild(deskG, paperG, tilesC, wheelC, noteC, stampC, scoreText, motesG)
      buildDesk()
      buildPaper()
      buildWheel()

      tick = (ticker: Ticker) => ambient(ticker.deltaMS)
      app.ticker.add(tick)
    },

    resize(app: Application) {
      W = app.screen.width
      H = app.screen.height
      recompute()
      buildDesk()
      buildPaper()
      buildWheel()
    },

    renderFrame(frame: CaesarFrame, t: number) {
      if (!initRef || !innerC || !centerText || !stampC || !stampG || !stampText || !scoreText) return
      const ev = frame.event
      const k = initRef.shift

      // Roue : le disque intérieur tourne de k crans (sens horaire inverse).
      const turn = ev === 'start' ? 0 : ev === 'wheel' ? easeInOutCubic(t) : 1
      innerC.rotation = -k * STEP * turn
      const shown = ev === 'start' ? '' : ev === 'wheel' ? (t > 0.85 ? `k = ${k}` : '') : `k = ${k}`
      centerText.text = shown
      if (ev === 'wheel' && t > 0.85) centerText.scale.set(easeOutBack(phase(t, 0.85, 1)))
      else centerText.scale.set(1)

      // Cases : dévoilées mot par mot.
      const player = initRef.player
      const expected = initRef.expected
      const finished = ev === 'passed' || ev === 'failed'
      for (const tile of tiles) {
        const want = expected[tile.index] ?? ''
        const got = player[tile.index]
        const ok = got === want
        let reveal = 0
        if (finished) reveal = 1
        else if (ev === 'word' && frame.word !== undefined) {
          if (tile.word < frame.word) reveal = 1
          else if (tile.word === frame.word) {
            const d = (tile.posInWord / Math.max(1, tile.wordLen)) * 0.5
            reveal = phase(t, d, d + 0.35)
          }
        }
        // Retournement de la case : elle s'écrase à mi-course, puis montre la réponse.
        tile.plain.scale.set(1, Math.max(0.05, Math.abs(Math.cos(reveal * Math.PI))))
        if (reveal < 0.5) {
          tile.plain.text = '·'
          tile.plain.style.fill = COLOR.inkDim
        } else {
          tile.plain.text = got === undefined ? '_' : got === ' ' ? '␣' : got
          tile.plain.style.fill = ok ? COLOR.ok : COLOR.ko
        }
        tile.fix.visible = ev === 'failed' && !ok && phase(t, 0.35, 0.6) > 0
        tile.fix.alpha = phase(t, 0.35, 0.6)
      }

      // Tampon final + bilan.
      stampG.clear()
      stampText.text = ''
      scoreText.text = ''
      if (finished) {
        const good = ev === 'passed'
        const color = good ? COLOR.ok : COLOR.ko
        stampText.text = good ? 'DÉCHIFFRÉ' : 'ERREUR'
        stampText.style.fill = color
        const pw = stampText.width + 28
        const ph = stampText.height + 14
        stampG.roundRect(-pw / 2, -ph / 2, pw, ph, 8).stroke({ color, width: 4 })
        stampG.roundRect(-pw / 2 + 5, -ph / 2 + 5, pw - 10, ph - 10, 5).stroke({ color, width: 1.5, alpha: 0.7 })
        // Coin bas-droit de la feuille, en tenant compte de la taille réelle du tampon.
        stampC.position.set(L.paperX + L.paperW - pw / 2 - 16, L.paperY + L.paperH - ph / 2 - 18)
        const p = phase(t, 0, 0.3)
        stampC.scale.set(2.2 - 1.2 * easeOutBack(p))
        stampC.alpha = p > 0 ? 0.86 : 0
        let right = 0
        for (let i = 0; i < expected.length; i++) if (player[i] === expected[i]) right++
        const letters = expected.length
        scoreText.text = good ? `Décalage ${k} : message entièrement décodé` : `${right} caractère${right > 1 ? 's' : ''} juste${right > 1 ? 's' : ''} sur ${letters}`
        scoreText.style.fill = color
        scoreText.alpha = phase(t, 0.3, 0.5)
      } else {
        stampC.alpha = 0
      }
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      deskG = motesG = paperG = stampG = null
      tilesC = wheelC = innerC = noteC = stampC = null
      centerText = stampText = scoreText = null
      tiles = []
      motes = []
      initRef = null
    },
  }
}
