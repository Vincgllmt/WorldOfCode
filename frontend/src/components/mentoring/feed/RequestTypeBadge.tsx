import type { MentoringRequestType } from '@/types/mentoring'

const TYPE_CONFIG: Record<MentoringRequestType, { emoji: string; label: string; className: string }> = {
  debug:       { emoji: '🐛', label: 'Debug',       className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  one_to_one:  { emoji: '💬', label: '1-to-1',      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  exercise:    { emoji: '📝', label: 'Exercice',    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  code_review: { emoji: '🔍', label: 'Code Review', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
}

export default function RequestTypeBadge({ type }: { type: MentoringRequestType }) {
  const config = TYPE_CONFIG[type]
  if (!config) return null
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <span aria-hidden="true">{config.emoji}</span>
      {config.label}
    </span>
  )
}
