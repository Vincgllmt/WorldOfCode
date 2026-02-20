import type { Experience } from '@/interfaces/user'

type ProfileExperienceItemProps = {
  experience: Experience
  isLast: boolean
}

function formatDate(dateStr: string): string {
  try {
    const [year, month] = dateStr.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  } catch {
    return dateStr
  }
}

export default function ProfileExperienceItem({
  experience,
  isLast,
}: ProfileExperienceItemProps) {
  const startFormatted = formatDate(experience.startDate)
  const endFormatted = experience.endDate ? formatDate(experience.endDate) : null

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${
          !experience.endDate
            ? 'border-green-500 bg-green-500'
            : 'border-green-500 bg-background'
        }`} />
        {!isLast && (
          <div className="w-px flex-1 bg-border" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h4 className="text-sm font-semibold text-foreground">
            {experience.title}
          </h4>
          {experience.company && (
            <span className="text-sm text-muted-foreground">
              · {experience.company}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {startFormatted} — {endFormatted ?? (
            <span className="font-medium text-green-600">Aujourd&apos;hui</span>
          )}
        </p>
        {experience.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {experience.description}
          </p>
        )}
      </div>
    </div>
  )
}
