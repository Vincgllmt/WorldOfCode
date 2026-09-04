import { fetchWithAuth } from '@/lib/fetchWithAuth'

export interface StripeConnectStatus {
  stripe_account_id: string | null
  transfers_enabled: boolean
  onboarding_required: boolean
}

/** Statut du compte connecté Stripe du mentor courant. */
export async function getStripeConnectStatus(): Promise<StripeConnectStatus> {
  const res = await fetchWithAuth('/stripe/connect/status')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur statut Stripe'), { status: res.status })
  }
  return res.json()
}

/**
 * Démarre (ou reprend) l'onboarding Stripe Connect du mentor courant.
 * Retourne l'URL du formulaire hébergé par Stripe où renseigner ses coordonnées bancaires.
 */
export async function startStripeOnboarding(): Promise<string> {
  const res = await fetchWithAuth('/stripe/connect/onboard', { method: 'POST', body: '{}' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur onboarding Stripe'), { status: res.status })
  }
  const data = await res.json()
  return data.onboarding_url as string
}
