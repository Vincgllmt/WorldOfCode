'use client'

import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

import type { GameViewer, GameViewerFactory, Replay } from './gameViewer'

const FRAME_MS = 420 // durée d'une frame à vitesse 1x
const SPEEDS = [0.5, 1, 2, 4]

export default function ReplayPlayer({
  replay,
  viewerFactory,
  autoPlay = true,
  onEnded,
}: {
  replay: Replay
  viewerFactory: GameViewerFactory
  autoPlay?: boolean
  /** Appelé une fois quand la lecture automatique atteint la dernière frame
   *  (sert à enchaîner plusieurs replays — un cas de test après l'autre). */
  onEnded?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const viewerRef = useRef<GameViewer | null>(null)
  const anim = useRef({ index: 0, t: 0, playing: false, speed: 1 })

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // onEnded gardé dans une ref pour ne pas relancer l'effet (qui remonterait PixiJS).
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  const frames = replay.frames
  const last = Math.max(0, frames.length - 1)

  useEffect(() => {
    let destroyed = false
    let endTimer: ReturnType<typeof setTimeout> | undefined
    let ended = false
    const fireEnded = () => {
      if (ended) return
      ended = true
      onEndedRef.current?.()
    }
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    const viewer = viewerFactory()
    viewerRef.current = viewer

    let ro: ResizeObserver | null = null
    let relayoutTimer: number | null = null
    let relaying = false
    let pending = false

    // Recalcule la mise en page du viewer pour la taille courante du canvas,
    // puis rejoue les frames jusqu'à l'image courante pour reconstituer l'état.
    const relayout = async () => {
      if (destroyed || !appRef.current) return
      if (relaying) {
        pending = true
        return
      }
      relaying = true
      do {
        pending = false
        viewer.teardown(appRef.current)
        // eslint-disable-next-line no-await-in-loop
        await viewer.setup(appRef.current, replay.init)
        if (destroyed) break
        const idx = Math.min(anim.current.index, last)
        for (let k = 0; k <= idx; k++) {
          viewer.renderFrame(frames[k], k === idx ? Math.min(anim.current.t, 1) : 1, k > 0 ? frames[k - 1] : null)
        }
      } while (pending && !destroyed)
      relaying = false
    }

    app
      .init({ resizeTo: host, antialias: true, background: 0x0b1f14, autoDensity: true, resolution: window.devicePixelRatio || 1 })
      .then(async () => {
        if (destroyed) {
          app.destroy(true)
          return
        }
        host.appendChild(app.canvas)
        appRef.current = app
        await viewer.setup(app, replay.init)
        if (destroyed) return
        viewer.renderFrame(frames[0], 0, null)

        // Démarre l'animation automatiquement (relancée à chaque "Jouer" via key).
        if (autoPlay && last > 0) {
          anim.current.playing = true
          setPlaying(true)
        } else if (autoPlay) {
          // Replay trivial (1 seule frame) : on signale la fin après un court instant
          // pour que la file de replays continue malgré tout.
          endTimer = setTimeout(fireEnded, 700)
        }

        app.ticker.add((ticker) => {
          const s = anim.current
          if (!s.playing) return
          s.t += (ticker.deltaMS / FRAME_MS) * s.speed
          while (s.t >= 1 && s.index < last) {
            s.index += 1
            s.t -= 1
            setIndex(s.index)
          }
          if (s.index >= last) {
            s.t = 1
            s.playing = false
            setPlaying(false)
            fireEnded()
          }
          const cur = frames[Math.min(s.index, last)]
          const prev = s.index > 0 ? frames[s.index - 1] : null
          viewer.renderFrame(cur, Math.min(s.t, 1), prev)
        })

        // Adapte la grille à la taille du panneau (initial + redimensionnement manuel).
        ro = new ResizeObserver(() => {
          if (relayoutTimer) clearTimeout(relayoutTimer)
          relayoutTimer = window.setTimeout(relayout, 80)
        })
        ro.observe(host)
      })

    return () => {
      destroyed = true
      if (relayoutTimer) clearTimeout(relayoutTimer)
      ro?.disconnect()
      if (endTimer) clearTimeout(endTimer)
      try {
        if (appRef.current) viewer.teardown(appRef.current)
      } catch {
        /* noop */
      }
      appRef.current?.destroy(true)
      appRef.current = null
      viewerRef.current = null
    }
    // Remonté quand le replay/jeu change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, viewerFactory])

  useEffect(() => {
    anim.current.speed = speed
  }, [speed])

  const renderAt = (i: number) => {
    viewerRef.current?.renderFrame(frames[i], 0, i > 0 ? frames[i - 1] : null)
  }

  const play = () => {
    const s = anim.current
    if (s.index >= last) {
      s.index = 0
      s.t = 0
      setIndex(0)
      renderAt(0)
    }
    s.playing = true
    setPlaying(true)
  }
  const pause = () => {
    anim.current.playing = false
    setPlaying(false)
  }
  const step = (dir: number) => {
    const s = anim.current
    s.playing = false
    setPlaying(false)
    s.index = Math.max(0, Math.min(last, s.index + dir))
    s.t = 0
    setIndex(s.index)
    renderAt(s.index)
  }
  const scrub = (i: number) => {
    const s = anim.current
    s.playing = false
    setPlaying(false)
    s.index = i
    s.t = 0
    setIndex(i)
    renderAt(i)
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        ref={hostRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-[#E8EEEA] bg-[#0b1f14]"
      />

      {/* Contrôles de replay */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={() => scrub(0)}
          className="rounded-lg p-2 text-[#5C6B63] transition hover:bg-[#F2F6F3]"
          title="Revenir au début"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => step(-1)}
          className="rounded-lg p-2 text-[#5C6B63] transition hover:bg-[#F2F6F3]"
          title="Frame précédente"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={playing ? pause : play}
          className="rounded-full bg-[#11A84F] p-2.5 text-white transition hover:bg-[#0E9F4A]"
          title={playing ? 'Pause' : 'Lecture'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={() => step(1)}
          className="rounded-lg p-2 text-[#5C6B63] transition hover:bg-[#F2F6F3]"
          title="Frame suivante"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <input
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => scrub(Number(e.target.value))}
          className="h-1.5 flex-1 accent-[#11A84F]"
        />

        <span className="w-12 text-right font-mono text-xs text-[#94A099]">
          {index}/{last}
        </span>

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-lg border border-[#E6ECE8] bg-[#F7FAF8] px-2 py-1 text-xs text-[#3A453F]"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
