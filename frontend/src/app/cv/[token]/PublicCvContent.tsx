'use client'

import CvTimeline from '@/components/profile/CvTimeline'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import type { PublicUser } from '@/interfaces/user'
import { MapPin, Globe } from 'lucide-react'
import Link from 'next/link'

type PublicCvContentProps = {
  user: PublicUser
}

function WocBanner() {
  return (
    <div className="print:hidden border-b border-border/60 bg-muted px-6 py-2 text-center text-xs text-muted-foreground">
      Créé avec{' '}
      <span className="font-semibold text-foreground">World of Code</span>
      {' — '}
      <Link href="/register" className="underline hover:text-foreground transition-colors">
        Rejoindre la plateforme
      </Link>
    </div>
  )
}

export default function PublicCvContent({ user }: PublicCvContentProps) {
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username

  return (
    <div className="min-h-screen bg-background">
      <WocBanner />

      <div className="mx-auto max-w-[680px] px-6 py-10 space-y-8">
        {/* Identity */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
          <p className="text-sm font-medium text-muted-foreground">@{user.username}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {user.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {user.location}
              </span>
            )}
            {user.availability && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {user.availability}
              </span>
            )}
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">{user.bio}</p>
          )}
        </header>

        {/* Experiences */}
        {user.experiences && user.experiences.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Expériences
            </h2>
            <CvTimeline experiences={user.experiences} />
          </section>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <ProfileSkillsSection
            skills={user.skills}
            isOwnProfile={false}
          />
        )}

        {/* Links */}
        {user.links && user.links.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Liens
            </h2>
            <div className="flex flex-wrap gap-2">
              {user.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors capitalize"
                >
                  {link.type}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
