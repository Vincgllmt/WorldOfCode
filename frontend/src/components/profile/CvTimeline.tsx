'use client'

import { motion } from 'framer-motion'
import type { Experience } from '@/interfaces/user'

type CvTimelineProps = {
  experiences: Experience[]
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function CvTimeline({ experiences }: CvTimelineProps) {
  if (experiences.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucune expérience renseignée.</p>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {experiences.map((exp, index) => {
        const isLast = index === experiences.length - 1
        const startFormatted = formatDate(exp.startDate)
        const endFormatted = exp.endDate ? formatDate(exp.endDate) : null
        const isCurrent = !exp.endDate

        return (
          <motion.div key={exp.id} variants={itemVariants} className="relative flex gap-4">
            {/* Dot + vertical line */}
            <div className="flex flex-col items-center">
              <div
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2"
                style={{
                  borderColor: 'var(--cv-accent, hsl(var(--primary)))',
                  backgroundColor: isCurrent
                    ? 'var(--cv-accent, hsl(var(--primary)))'
                    : 'hsl(var(--background))',
                }}
              />
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
                {exp.company && (
                  <span className="text-sm text-muted-foreground">· {exp.company}</span>
                )}
              </div>
              {exp.location && (
                <p className="text-xs text-muted-foreground">{exp.location}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {startFormatted} —{' '}
                {endFormatted ?? (
                  <span className="font-medium" style={{ color: 'var(--cv-accent, hsl(var(--primary)))' }}>Aujourd&apos;hui</span>
                )}
              </p>
              {exp.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {exp.description}
                </p>
              )}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
