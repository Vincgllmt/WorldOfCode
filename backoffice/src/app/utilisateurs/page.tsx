// app/utilisateurs/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AdminUserPanel = dynamic(() => import('@/components/adminPanel/AdminUserPanel'), {
  ssr: false,
  loading: () => <p className="text-muted-foreground">Chargement du module…</p>,
})

export default function UtilisateursPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les comptes, les rôles et les accès.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => location.reload()}>
          Rafraîchir
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Liste des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
            <AdminUserPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
