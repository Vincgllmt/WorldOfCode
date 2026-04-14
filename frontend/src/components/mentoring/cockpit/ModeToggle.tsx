'use client'

import { useState } from 'react'
import { toggleAvailability } from '@/lib/api/mentoring/profile'

interface Props {
  isAvailable: boolean
  onToggle: (newValue: boolean) => void
}

export default function ModeToggle({ isAvailable, onToggle }: Props) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const result = await toggleAvailability(!isAvailable)
      onToggle(result.isAvailable)
    } catch {
      // Silently fail — état UI non changé
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={isAvailable}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
        isAvailable
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {/* Icône + texte — jamais uniquement la couleur (NFR11) */}
      <span aria-hidden="true">{isAvailable ? '✓' : '○'}</span>
      <span>{loading ? 'Mise à jour...' : isAvailable ? 'Disponible' : 'Mode Lecture'}</span>
    </button>
  )
}
