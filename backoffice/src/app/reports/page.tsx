'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les signalements de contenu. La liste se rafraîchit automatiquement toutes les 30 secondes.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Signalements</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
            <AdminReportPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
