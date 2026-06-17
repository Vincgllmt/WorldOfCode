'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

export default function ArenaLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'cyberpunk-dark'
  const logoSrc = mounted ? (isDark ? '/logo_white.png' : '/logo2.png') : '/logo_white.png'

  // Pages profondes (jeu, sandbox) = plein écran sans padding ; la liste reste paddée.
  const fullBleed = pathname.startsWith('/arena/')

  return (
    <div className={cn('bg-background', fullBleed ? 'flex h-screen flex-col overflow-hidden' : 'min-h-screen')}>
      {/* Barre Code Arena, au style de la navbar WOC */}
      <header className="navbar-themed sticky top-0 z-50 w-full shrink-0 border-b px-6 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <Link href="/arena" className="flex items-center gap-3">
            <Image
              src={logoSrc}
              alt="World of Code"
              width={140}
              height={44}
              className="h-9 w-auto"
              priority
            />
            <span className="hidden font-mono text-base font-bold text-foreground sm:inline">
              / Code Arena
            </span>
          </Link>

          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Retour à </span>World of Code
          </Link>
        </div>
      </header>

      {fullBleed ? (
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      ) : (
        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      )}
    </div>
  )
}
