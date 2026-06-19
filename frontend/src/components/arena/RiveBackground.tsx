'use client'

import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas'

/**
 * Rendu d'un fond animé Rive (.riv) en plein cadre.
 *
 * Chargé dynamiquement par `LevelBackground` uniquement quand un niveau pointe
 * vers un fichier `.riv` (cf. next/dynamic ssr:false). Le runtime n'est donc
 * jamais embarqué tant qu'aucun fond Rive n'est utilisé.
 */
export default function RiveBackground({ src }: { src: string }) {
  const { RiveComponent } = useRive({
    src,
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  })

  return <RiveComponent className="h-full w-full" />
}
