import { AVAILABILITY_CONFIG } from '@/lib/profile-constants'
import type { Availability } from '@/interfaces/user'

type AvailabilityBadgeProps = {
  availability: Availability | null | undefined
}

export default function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  if (!availability) return null

  const config = AVAILABILITY_CONFIG[availability]
  if (!config) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      {config.dotClass && (
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dotClass}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
          />
        </span>
      )}
      {config.label}
    </span>
  )
}
