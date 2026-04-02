'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAdminStats } from '@/hooks/useAdminStats'

const AdminGroupPanel = dynamic(
  () => import('@/components/adminPanel/AdminGroupPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

const AdminGroupSuggestionPanel = dynamic(
  () => import('@/components/adminPanel/AdminGroupSuggestionPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

function GroupsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') ?? 'groups'
  const { stats } = useAdminStats()
  const pendingCount = stats?.pendingGroupSuggestionsCount ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Groupes</h1>
      <Tabs value={tab} onValueChange={(val) => router.push(`/groups?tab=${val}`)}>
        <TabsList>
          <TabsTrigger value="groups">Groupes</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            Suggestions
            {pendingCount > 0 && (
              <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="mt-4">
          <AdminGroupPanel />
        </TabsContent>
        <TabsContent value="suggestions" className="mt-4">
          <AdminGroupSuggestionPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <GroupsPageContent />
    </Suspense>
  )
}
