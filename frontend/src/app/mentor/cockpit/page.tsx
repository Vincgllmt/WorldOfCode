'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MentorCockpitPage from '@/components/mentoring/cockpit/MentorCockpitPage'
import { getMyMentorProfile } from '@/lib/api/mentoring/profile'
import type { MentorProfile } from '@/types/mentoring'

export default function CockpitPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MentorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyMentorProfile()
      .then(setProfile)
      .catch((err: unknown) => {
        const status = (err as { status?: number }).status
        if (status === 404 || status === 403) {
          router.replace('/mentor/onboarding')
        } else {
          router.replace('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Chargement du cockpit...</p>
      </div>
    )
  }

  if (!profile) return null

  return <MentorCockpitPage initialProfile={profile} />
}
