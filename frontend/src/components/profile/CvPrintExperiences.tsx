import type { Experience } from '@/interfaces/user'

type Props = { experiences: Experience[] }

function formatDate(dateStr: string): string {
  try {
    const [year, month] = dateStr.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date)
  } catch {
    return dateStr
  }
}

export default function CvPrintExperiences({ experiences }: Props) {
  if (experiences.length === 0) return null

  return (
    <div className="hidden print:block space-y-4">
      {experiences.map((exp) => (
        <div key={exp.id}>
          <div className="flex justify-between items-baseline gap-4">
            <div>
              <span className="text-sm font-semibold text-black">{exp.title}</span>
              {exp.company && (
                <span className="text-sm text-gray-600"> · {exp.company}</span>
              )}
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {formatDate(exp.startDate)} — {exp.endDate ? formatDate(exp.endDate) : "Aujourd'hui"}
            </span>
          </div>
          {exp.location && (
            <p className="text-xs text-gray-500">{exp.location}</p>
          )}
          {exp.description && (
            <p className="mt-1 text-sm text-gray-700 leading-relaxed">{exp.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
