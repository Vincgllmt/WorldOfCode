'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { getStripeConnectStatus, startStripeOnboarding } from '@/lib/api/stripe'

type State =
  | { kind: 'loading' }
  | { kind: 'enabled' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }

export default function StripeOnboardingCompletePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    getStripeConnectStatus()
      .then(status => {
        if (status.transfers_enabled) setState({ kind: 'enabled' })
        else setState({ kind: 'pending' })
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'Erreur inattendue.' })
      })
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      window.location.href = await startStripeOnboarding()
    } catch {
      setRetrying(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {state.kind === 'loading' && (
        <p className="text-muted-foreground">Vérification de votre compte Stripe…</p>
      )}

      {state.kind === 'enabled' && (
        <>
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Vos paiements sont configurés</h1>
          <p className="text-muted-foreground mb-6">
            Vos mentorés peuvent désormais vous envoyer un don à la fin d&apos;une session.
          </p>
          <Link
            href="/mentor/cockpit"
            className="inline-block bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium"
          >
            Aller au cockpit
          </Link>
        </>
      )}

      {state.kind === 'pending' && (
        <>
          <Clock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Vérification en cours</h1>
          <p className="text-muted-foreground mb-6">
            Stripe vérifie les informations que vous avez fournies. Cela peut prendre quelques minutes.
            Vous pourrez recevoir des dons dès que la vérification sera terminée.
          </p>
          <div className="flex flex-col gap-2 items-center">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {retrying ? 'Redirection…' : 'Compléter mes informations'}
            </button>
            <Link href="/mentor/cockpit" className="text-sm text-muted-foreground hover:underline">
              Revenir au cockpit
            </Link>
          </div>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-bold mb-2">Une erreur est survenue</h1>
          <p className="text-muted-foreground mb-6">{state.message}</p>
          <Link href="/mentor/cockpit" className="text-sm text-primary hover:underline">
            Revenir au cockpit
          </Link>
        </>
      )}
    </div>
  )
}
