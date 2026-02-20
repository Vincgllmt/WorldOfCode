import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Pencil } from 'lucide-react'
import ProfileExperienceItem from './ProfileExperienceItem'
import type { Experience } from '@/interfaces/user'

type ProfileExperienceSectionProps = {
  experiences: Experience[] | null | undefined
  isOwnProfile: boolean
  onEdit?: () => void
}

export default function ProfileExperienceSection({
  experiences,
  isOwnProfile,
  onEdit,
}: ProfileExperienceSectionProps) {
  const sorted = useMemo(() => {
    if (!experiences || experiences.length === 0) return []
    return [...experiences].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [experiences])

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Expériences
          </CardTitle>
          {isOwnProfile && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label="Modifier les expériences"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div>
            {sorted.map((exp, index) => (
              <ProfileExperienceItem
                key={`${exp.title}-${exp.startDate}-${index}`}
                experience={exp}
                isLast={index === sorted.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isOwnProfile
              ? 'Aucune expérience renseignée. Complétez votre profil dans les réglages.'
              : 'Aucune expérience renseignée.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
