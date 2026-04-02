'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AdminGroupSuggestionPanel = dynamic(
  () => import('@/components/adminPanel/AdminGroupSuggestionPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement du module…</p> }
)

export default function GroupSuggestionsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suggestions de groupes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les suggestions de création de groupes soumises par les utilisateurs.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Suggestions en attente et traitées</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
            <AdminGroupSuggestionPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
