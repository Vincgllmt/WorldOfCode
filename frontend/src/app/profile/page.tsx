'use client'

import UserProfilePage from '@/components/account/UserProfilePage'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfilePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted-foreground">
        Vous devez être connecté pour accéder à votre profil.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <UserProfilePage userId={user.id} />
    </div>
  )
}
