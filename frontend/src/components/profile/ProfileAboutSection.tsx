import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Pencil } from 'lucide-react'

type ProfileAboutSectionProps = {
  bio: string | null | undefined
  isOwnProfile: boolean
  onEdit?: () => void
  visibilityToggle?: ReactNode
}

export default function ProfileAboutSection({ bio, isOwnProfile, onEdit, visibilityToggle }: ProfileAboutSectionProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-muted-foreground" />
            À propos
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
                aria-label="Modifier la bio"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bio ? (
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {bio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isOwnProfile
              ? 'Aucune bio renseignée. Complétez votre profil dans les réglages.'
              : 'Aucune bio renseignée.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
