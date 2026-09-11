import { fetchWithAuth } from '@/lib/fetchWithAuth'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled'

export interface DonationStatusResponse {
  /** true si le mentor a un compte Stripe actif et peut recevoir des dons. */
  mentorReady: boolean
  payment: {
    status: PaymentStatus
    amount: number
    currency: string
    createdAt: string
  } | null
}

export interface CreateDonationIntentResponse {
  client_secret: string
  payment_intent_id: string
  application_fee_cents: number
}

/** Statut de don pour une session de mentorat (mentor prêt + dernier paiement éventuel). */
export async function getSessionDonationStatus(sessionId: number): Promise<DonationStatusResponse> {
  const res = await fetchWithAuth(`/payment/session/${sessionId}/status`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur statut de don'), { status: res.status })
  }
  return res.json()
}

/** Crée le PaymentIntent Stripe pour un don au mentor d'une session terminée. */
export async function createDonationIntent(
  sessionId: number,
  amount: number,
  currency = 'eur',
): Promise<CreateDonationIntentResponse> {
  const res = await fetchWithAuth('/payment/intent', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, amount, currency }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur création du paiement'), { status: res.status })
  }
  return res.json()
}
