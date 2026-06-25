import CvTimeline from '@/components/profile/CvTimeline'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin } from 'lucide-react'
import AvailabilityBadge from '@/components/profile/AvailabilityBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, User } from 'lucide-react'
import type { CvLayout, User as UserType } from '@/interfaces/user'
import type { CSSProperties } from 'react'

type Props = {
  user: UserType
  layout: CvLayout
  accentColor: string | null
}

const layoutClasses: Record<CvLayout, string> = {
  'sidebar-left':   'flex flex-row gap-5 items-start',
  'sidebar-right':  'flex flex-row-reverse gap-5 items-start',
  'single-column':  'flex flex-col gap-5',
}

const sidebarClasses: Record<CvLayout, string> = {
  'sidebar-left':  'w-56 shrink-0',
  'sidebar-right': 'w-56 shrink-0',
  'single-column': 'w-full',
}

function getInitials(username: string) {
  const parts = username.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]?.slice(0, 2)?.toUpperCase() ?? ''
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export default function CvPreview({ user, layout, accentColor }: Props) {
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username
  const isSingleCol = layout === 'single-column'

  const accentStyle = accentColor
    ? ({ '--cv-accent': accentColor } as CSSProperties)
    : undefined

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 overflow-auto" style={accentStyle}>
      <div className={layoutClasses[layout]}>
        {/* Sidebar */}
        <div className={sidebarClasses[layout]}>
          <div className="rounded-xl border border-border/70 bg-background p-4 space-y-3">
            <div className={`flex gap-3 ${isSingleCol ? 'flex-row items-center' : 'flex-col items-center text-center'}`}>
              <Avatar className="h-14 w-14 border-2 border-border shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">{fullName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                {user.availability && (
                  <div className="mt-1">
                    <AvailabilityBadge availability={user.availability} />
                  </div>
                )}
              </div>
            </div>

            {user.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {user.location}
              </p>
            )}

            {user.links && user.links.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {user.links.map((link) => (
                  <span
                    key={link.id}
                    className="text-xs rounded border border-border/70 px-1.5 py-0.5 capitalize text-muted-foreground"
                  >
                    {link.type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {user.bio && (
            <Card className="border-border/70 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  À propos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{user.bio}</p>
              </CardContent>
            </Card>
          )}

          {user.experiences && user.experiences.length > 0 && (
            <Card className="border-border/70 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  Expériences
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <CvTimeline experiences={user.experiences} />
              </CardContent>
            </Card>
          )}

          {user.skills && user.skills.length > 0 && (
            <ProfileSkillsSection skills={user.skills} isOwnProfile={false} />
          )}
        </div>
      </div>
    </div>
  )
}
