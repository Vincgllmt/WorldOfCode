'use client'

import { useAuth } from '@/hooks/useAuth'
import { useUser, useUserGroups } from '@/hooks/useUsers'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileDetails() {
  const { user } = useAuth()
  const { data, isLoading, error } = useUser(user?.id)
  const { data: groups, isLoading: loadingGroups } = useUserGroups(user?.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-64" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-red-500">Erreur lors du chargement du profil.</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p>
          <strong>Nom d’utilisateur :</strong> {data.username}
        </p>
        <p>
          <strong>Rôle :</strong> {data.role}
        </p>
        <p>
          <strong>Date de création :</strong>{' '}
          {new Date(data.creationDate).toLocaleDateString()}
        </p>
        <p>
          <strong>Dernière mise à jour :</strong>{' '}
          {new Date(data.updateDate).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold mt-4">Groupes rejoints</h2>
        {loadingGroups ? (
          <Skeleton className="h-6 w-60" />
        ) : groups && groups.length > 0 ? (
          <ul className="list-disc list-inside">
            {groups.map((group) => (
              <li key={group.id}>{group.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Aucun groupe rejoint.</p>
        )}
      </div>
    </div>
  )
}
