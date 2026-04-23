'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

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
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gérez les signalements de contenu.
        </p>
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <AdminReportPanel />
      </Suspense>
    </div>
  )
}
