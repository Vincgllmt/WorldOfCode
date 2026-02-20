'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

type LandingNavbarProps = {
  showRegister?: boolean
  showLogin?: boolean
}

export default function LandingNavbar({
  showRegister = true,
  showLogin = true,
}: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-green-100'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo2.png"
              alt="World of Code"
              width={160}
              height={50}
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {showLogin && (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:text-green-700 hover:bg-green-50"
                >
                  Se connecter
                </Button>
              </Link>
            )}
            {showRegister && (
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 rounded-full px-5"
                >
                  S&apos;inscrire gratuitement
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-green-700"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-green-100 pt-3">
            <div className="flex flex-col gap-2 pt-2 px-3">
              {showLogin && (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full">
                    Se connecter
                  </Button>
                </Link>
              )}
              {showRegister && (
                <Link href="/register">
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                    S&apos;inscrire gratuitement
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
