import UserProfilePage from '@/components/account/UserProfilePage'

type UserProfileRouteProps = {
  params: {
    id: string
  }
}

export default function PublicProfilePage({ params }: UserProfileRouteProps) {
  const userId = Number(params.id)

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-destructive">
        Profil utilisateur introuvable.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <UserProfilePage userId={userId} />
    </div>
  )
}
