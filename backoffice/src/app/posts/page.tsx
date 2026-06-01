'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AdminPostPanel = dynamic(
  () => import('@/components/adminPanel/AdminPostPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement du module…</p> }
)

export default function PostsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez les posts, leurs groupes et auteurs.</p>
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <AdminPostPanel />
      </Suspense>
    </div>
  )
}
