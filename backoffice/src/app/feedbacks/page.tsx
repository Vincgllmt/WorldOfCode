'use client'

import dynamic from 'next/dynamic'

const AdminFeedbackPanel = dynamic(
  () => import('@/components/adminPanel/AdminFeedbackPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

export default function FeedbacksPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Feedbacks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Retours d&apos;expérience soumis par les utilisateurs.
        </p>
      </header>
      <AdminFeedbackPanel />
    </div>
  )
}
