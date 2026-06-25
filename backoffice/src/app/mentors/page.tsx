'use client'

import dynamic from 'next/dynamic'

const AdminMentorPanel = dynamic(
  () => import('@/components/adminPanel/AdminMentorPanel'),
  { ssr: false, loading: () => <p className="text-muted-foreground">Chargement…</p> }
)

export default function MentorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mentors</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Profils mentor, statistiques de sessions et évaluations.
        </p>
      </header>
      <AdminMentorPanel />
    </div>
  )
}
