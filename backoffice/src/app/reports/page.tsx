'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAdminReports } from '@/hooks/useAdminReports'

const AdminReportedPostsPanel = dynamic(
  () => import('@/components/adminPanel/AdminReportedPostsPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

const AdminReportPanel = dynamic(
  () => import('@/components/adminPanel/AdminReportPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

const AdminMyModerationPanel = dynamic(
  () => import('@/components/adminPanel/AdminMyModerationPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

function ReportsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') ?? 'posts'

  const { total: myCount } = useAdminReports({
    page: 1, limit: 1, status: 'IN_PROGRESS', claimedByMe: true,
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gérez les signalements de contenu.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(val) => router.push(`/reports?tab=${val}`)}>
        <TabsList>
          <TabsTrigger value="posts">Posts signalés</TabsTrigger>
          <TabsTrigger value="reports">Tous les signalements</TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            Mes modérations
            {myCount > 0 && (
              <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-blue-500/15 px-1.5 text-[10px] font-bold text-blue-600">
                {myCount > 99 ? '99+' : myCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <AdminReportedPostsPanel />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <AdminReportPanel />
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <AdminMyModerationPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <ReportsPageContent />
    </Suspense>
  )
}
