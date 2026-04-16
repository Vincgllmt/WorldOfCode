'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MentorOnboardingForm from '@/components/mentoring/MentorOnboardingForm'
import { getMyMentorProfile } from '@/lib/api/mentoring/profile'

export default function MentorOnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    getMyMentorProfile()
      .then(() => {
        if (!cancelled) router.replace('/mentor/cockpit')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = (err as { status?: number }).status
        if (status === 404) {
          setChecking(false)
        } else {
          router.replace('/unauthorized')
        }
      })

    return () => { cancelled = true }
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Devenir Mentor</h1>
      <p className="text-muted-foreground mb-8">
        Configurez votre profil mentor pour être visible par les juniors.
      </p>
      <MentorOnboardingForm onSuccess={() => router.push('/mentor/cockpit')} />
    </div>
  )
}
