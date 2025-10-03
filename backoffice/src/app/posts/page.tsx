'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AdminPostPanel = dynamic(
  () => import('@/components/adminPanel/AdminPostPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement du module…</p> }
)

export default function PostsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">Gérez les posts, leurs groupes et auteurs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => location.reload()}>
          Rafraîchir
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Liste des posts</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
            <AdminPostPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
