'use client'

import CvTimeline from '@/components/profile/CvTimeline'
import CvPrintHeader from '@/components/profile/CvPrintHeader'
import CvPrintExperiences from '@/components/profile/CvPrintExperiences'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import PrintButton from './PrintButton'
import type { PublicUser } from '@/interfaces/user'
import { MapPin, Globe } from 'lucide-react'
import Link from 'next/link'
import { CATEGORY_LABELS } from '@/lib/profile-constants'
import type { SkillCategory } from '@/interfaces/user'

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

  const skillsByCategory = (user.skills ?? []).reduce<Record<string, string[]>>((acc, skill) => {
    const cat = skill.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill.name)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style>{`
        @media print {
          @page { margin: 20mm 15mm; size: A4; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <WocBanner />

      {/* Toolbar print:hidden */}
      <div className="print:hidden flex justify-end px-6 py-3 border-b border-border/60">
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[680px] px-6 py-10 space-y-8 print:py-0 print:px-0 print:max-w-none">
        {/* Header print-only */}
        <CvPrintHeader user={user} />

        {/* Identity — masqué en print (remplacé par CvPrintHeader) */}
        <header className="space-y-2 print:hidden">
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
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
              Expériences
            </h2>
            {/* Timeline animée — masquée en print */}
            <div className="print:hidden">
              <CvTimeline experiences={user.experiences} />
            </div>
            {/* Liste simple — visible seulement en print */}
            <CvPrintExperiences experiences={user.experiences} />
          </section>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <>
            {/* Version badges — masquée en print */}
            <div className="print:hidden">
              <ProfileSkillsSection skills={user.skills} isOwnProfile={false} />
            </div>
            {/* Version texte — visible seulement en print */}
            <div className="hidden print:block space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-black">
                Compétences
              </h2>
              {Object.entries(skillsByCategory).map(([category, names]) => (
                <p key={category} className="text-sm text-gray-700">
                  <span className="font-medium text-black">
                    {CATEGORY_LABELS[category as SkillCategory] ?? category}
                  </span>
                  {' : '}
                  {names.join(', ')}
                </p>
              ))}
            </div>
          </>
        )}

        {/* Links */}
        {user.links && user.links.length > 0 && (
          <section className="print:hidden">
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
