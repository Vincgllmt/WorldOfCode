'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themes = [
  { value: 'light',           label: 'Clair',          colors: ['#ffffff', '#16a34a', '#dcfce7'] },
  { value: 'dark',            label: 'Sombre Vert',    colors: ['#111827', '#4ade80', '#1f2937'] },
  { value: 'cyberpunk-dark',  label: 'Cyberpunk Dark', colors: ['#0a0a0f', '#06b6d4', '#a855f7'] },
  { value: 'cyberpunk-light', label: 'Cyberpunk Light',colors: ['#f0f9ff', '#0891b2', '#7c3aed'] },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Changer de thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="flex gap-0.5">
              {t.colors.map((color, i) => (
                <span
                  key={i}
                  className="inline-block h-4 w-4 rounded-full border border-foreground/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="flex-1">{t.label}</span>
            {theme === t.value && (
              <span className="text-primary text-xs font-bold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
