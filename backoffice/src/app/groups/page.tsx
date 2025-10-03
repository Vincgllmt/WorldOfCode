'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AdminGroupPanel = dynamic(
  () => import('@/components/adminPanel/AdminGroupPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement du module…</p> }
)

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Groupes</h1>
          <p className="text-sm text-muted-foreground">
            Créez, modifiez et supprimez les groupes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => location.reload()}>
          Rafraîchir
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Gestion des groupes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
            <AdminGroupPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
