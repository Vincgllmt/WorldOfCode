'use client'

import { Eye, Users, Lock } from 'lucide-react'
import type { Visibility } from '@/interfaces/user'

type VisibilityToggleProps = {
  visibility: Visibility
  onChange: (newVisibility: Visibility) => void
  disabled?: boolean
}

const VISIBILITY_CONFIG = {
  PUBLIC: {
    label: 'Public',
    icon: Eye,
    className:
      'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800',
  },
  CONNECTED: {
    label: 'Connecté',
    icon: Users,
    className:
      'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
  },
  PRIVATE: {
    label: 'Privé',
    icon: Lock,
    className: 'text-muted-foreground bg-muted border-border',
  },
}

const CYCLE: Record<Visibility, Visibility> = {
  PUBLIC: 'CONNECTED',
  CONNECTED: 'PRIVATE',
  PRIVATE: 'PUBLIC',
}

export function VisibilityToggle({ visibility, onChange, disabled }: VisibilityToggleProps) {
  const config = VISIBILITY_CONFIG[visibility]
  const Icon = config.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(CYCLE[visibility])}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </button>
  )
}
