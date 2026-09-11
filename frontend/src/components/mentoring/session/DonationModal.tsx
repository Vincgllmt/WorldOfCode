'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { createDonationIntent } from '@/lib/api/payment'

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

const PRESET_AMOUNTS_CENTS = [500, 1000, 2000, 5000]

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Le paiement a échoué.')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setError("Le paiement n'a pas pu être confirmé.")
      setLoading(false)
    }
  }

  return (
    <>
      <PaymentElement />
      {error && (
        <p role="alert" className="text-destructive text-sm flex items-center gap-2 mt-4">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !stripe}
        className="w-full mt-6 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Paiement en cours...' : 'Payer'}
      </button>
    </>
  )
}

interface Props {
  sessionId: number
  mentorUsername: string
  onClose: () => void
  onDonated: () => void
}

export default function DonationModal({ sessionId, mentorUsername, onClose, onDonated }: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resolvedAmount = selectedAmount ?? Math.round(parseFloat(customAmount.replace(',', '.')) * 100)

  const handleContinue = async () => {
    if (!resolvedAmount || Number.isNaN(resolvedAmount) || resolvedAmount < 50) {
      setError('Montant minimum : 0,50 €.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { client_secret } = await createDonationIntent(sessionId, resolvedAmount)
      setClientSecret(client_secret)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setSuccess(true)
    setTimeout(() => {
      onDonated()
      onClose()
    }, 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-modal-title"
    >
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        {!stripePromise ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3" aria-hidden="true">⚙️</p>
            <p className="font-medium">Les dons ne sont pas disponibles pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-1">Le paiement en ligne n&apos;est pas configuré.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full border border-border rounded-lg py-2.5 text-sm hover:bg-muted transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : success ? (
          <div className="text-center py-4" role="status">
            <p className="text-3xl mb-3" aria-hidden="true">💜</p>
            <p className="font-medium">Merci pour votre don !</p>
            <p className="text-sm text-muted-foreground mt-1">
              {mentorUsername} recevra votre soutien.
            </p>
          </div>
        ) : clientSecret ? (
          <>
            <h2 id="donation-modal-title" className="text-lg font-semibold mb-1">
              Soutenir {mentorUsername}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Montant : {formatEuros(resolvedAmount)} €
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm onSuccess={handleSuccess} />
            </Elements>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-3 border border-border rounded-lg py-2.5 text-sm hover:bg-muted transition-colors"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <h2 id="donation-modal-title" className="text-lg font-semibold mb-1">
              Soutenir {mentorUsername}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Un geste optionnel pour remercier votre mentor du temps qu&apos;il vous a consacré.
            </p>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS_CENTS.map(cents => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => { setSelectedAmount(cents); setCustomAmount('') }}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    selectedAmount === cents
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {formatEuros(cents)} €
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label htmlFor="donation-custom-amount" className="block text-sm font-medium mb-1">
                Montant libre <span className="text-muted-foreground font-normal">(en euros)</span>
              </label>
              <input
                id="donation-custom-amount"
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                placeholder="0,50"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm flex items-center gap-2 mb-4">
                <span aria-hidden="true">⚠️</span> {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading || (!selectedAmount && !customAmount)}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Continuer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
