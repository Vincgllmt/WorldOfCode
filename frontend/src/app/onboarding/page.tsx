'use client'

import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import OnboardingStepper from '@/components/onboarding/OnboardingStepper'
import Image from 'next/image'
import Link from 'next/link'

export default function OnboardingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex flex-col">
      <nav className="bg-green-50/80 backdrop-blur-md border-b border-green-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/">
            <Image
              src="/logo2.png"
              alt="World of Code"
              width={160}
              height={50}
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex justify-center items-start px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Bienvenue, {user.username} !
            </h1>
            <p className="text-muted-foreground mt-1">
              Complétez votre profil pour une meilleure expérience. Chaque étape est optionnelle.
            </p>
          </div>
          <OnboardingStepper />
        </div>
      </div>
    </div>
  )
}
