'use client'

import { useEffect, useState } from 'react'

/**
 * Rendu d'un fond SVG animé en l'INLINANT dans le DOM.
 *
 * Un `.svg` chargé via `<img src>` ne joue PAS ses animations (CSS comme SMIL
 * sont gelées dans une balise image). On récupère donc le markup et on l'injecte
 * directement : les `<style>`/`@keyframes`/`<animate>` internes s'exécutent alors
 * normalement. Idéal pour un fond animé sans asset binaire à produire.
 */
export default function InlineSvgBackground({ src }: { src: string }) {
  const [markup, setMarkup] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setMarkup(t)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src])

  if (!markup) return null

  return (
    <div
      className="absolute inset-0 h-full w-full [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
