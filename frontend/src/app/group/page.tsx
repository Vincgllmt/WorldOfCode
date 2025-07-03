'use client'

import Link from 'next/link'
import { useGroups } from '@/hooks/useGroups'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function GroupsPage() {
  const { groups, isLoading, error } = useGroups()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-red-500 p-4">Erreur lors du chargement des groupes.</p>

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Groupes techniques</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups?.map(group => (
          <Link
            href={`/group/${group.id}`}
            key={group.id}
            className="block hover:shadow-md transition-shadow rounded-xl"
          >
            <Card className="h-full hover:bg-green-50">
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
