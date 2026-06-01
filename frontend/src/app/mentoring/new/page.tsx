'use client'

import { useRouter } from 'next/navigation'
import RequestFormWizard from '@/components/mentoring/request/RequestFormWizard'

export default function NewMentoringRequestPage() {
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Nouvelle demande de mentorat</h1>
      <p className="text-muted-foreground mb-8">
        Décrivez votre problème étape par étape pour trouver le mentor idéal.
      </p>
      <RequestFormWizard onSuccess={() => router.push('/mentoring/my-requests?created=1')} />
    </div>
  )
}
