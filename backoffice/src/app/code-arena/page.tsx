'use client'

import dynamic from 'next/dynamic'

const AdminCodeArenaPanel = dynamic(
  () => import('@/components/adminPanel/AdminCodeArenaPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

export default function CodeArenaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Code Arena</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Jeux synchronisés depuis le dépôt, cas de test, referee et solutions de référence.
        </p>
      </header>
      <AdminCodeArenaPanel />
    </div>
  )
}
