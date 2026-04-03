'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'

const AdminReportPanel = dynamic(
  () => import('@/components/adminPanel/AdminReportPanel'),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground">Chargement du module…</p>,
  }
)

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez les signalements de contenu. La liste se rafraîchit automatiquement toutes les 30 secondes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => location.reload()}>
          Rafraîchir
        </Button>
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <AdminReportPanel />
      </Suspense>
    </div>
  )
}
