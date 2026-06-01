'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AdminUserPanel = dynamic(() => import('@/components/adminPanel/AdminUserPanel'), {
  ssr: false,
  loading: () => <p className="text-muted-foreground">Chargement du module…</p>,
})

export default function UtilisateursPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gérez les comptes, les rôles et les accès.
        </p>
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <AdminUserPanel />
      </Suspense>
    </div>
  )
}
