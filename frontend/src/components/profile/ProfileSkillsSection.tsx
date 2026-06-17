import { useMemo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code2, Pencil } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/profile-constants'
import type { Skill, SkillCategory } from '@/interfaces/user'

type ProfileSkillsSectionProps = {
  skills: Skill[] | null | undefined
  isOwnProfile: boolean
  onEdit?: () => void
  visibilityToggle?: ReactNode
}

export default function ProfileSkillsSection({
  skills,
  isOwnProfile,
  onEdit,
  visibilityToggle,
}: ProfileSkillsSectionProps) {
  const skillsByCategory = useMemo(() => {
    if (!skills || skills.length === 0) return {}
    return skills.reduce<Record<string, Skill[]>>((acc, skill) => {
      const cat = skill.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(skill)
      return acc
    }, {})
  }, [skills])

  const hasSkills = Object.keys(skillsByCategory).length > 0

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            Compétences
          </CardTitle>
          <div className="flex items-center gap-2">
            {visibilityToggle}
            {isOwnProfile && onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                aria-label="Modifier les compétences"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasSkills ? (
          <div className="space-y-4">
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[category as SkillCategory] ?? category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {categorySkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isOwnProfile
              ? 'Aucune compétence renseignée. Complétez votre profil dans les réglages.'
              : 'Aucune compétence renseignée.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
