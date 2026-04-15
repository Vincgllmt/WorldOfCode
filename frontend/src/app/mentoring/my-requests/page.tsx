'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getMentoringRequestsMine } from '@/lib/api/mentoring/requests'
import type { MentoringRequest } from '@/types/mentoring'

export default function MyRequestsPage() {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<MentoringRequest[]>([])
  const [loading, setLoading] = useState(true)

  const justCreated = searchParams.get('created') === '1'

  useEffect(() => {
    getMentoringRequestsMine()
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {justCreated && (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <span aria-hidden="true">✓</span> Votre demande a été soumise avec succès !
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes demandes</h1>
        <Link
          href="/mentoring/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          + Nouvelle demande
        </Link>
      </div>

      {requests.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Aucune demande pour l&apos;instant.{' '}
          <Link href="/mentoring/new" className="underline">Créez votre première demande.</Link>
        </p>
      )}

      <div className="space-y-4">
        {requests.map(r => (
          <MyRequestCard key={r.id} request={r} />
        ))}
      </div>
    </div>
  )
}

function MyRequestCard({ request: r }: { request: MentoringRequest }) {
  const statusLabel: Record<string, string> = {
    pending: '⏳ En attente',
    pinned: '📌 Épinglée',
    accepted: '✓ Acceptée',
    cancelled: '✗ Annulée',
    expired: '⌛ Expirée',
  }

  const statusClass: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pinned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-muted text-muted-foreground',
    expired: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium truncate">{r.title}</h2>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${statusClass[r.status] ?? 'bg-muted text-muted-foreground'}`}>
          {statusLabel[r.status] ?? r.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{r.techStack}</p>
      <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
    </div>
  )
}
