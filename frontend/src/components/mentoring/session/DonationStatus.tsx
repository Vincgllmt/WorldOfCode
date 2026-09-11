'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { getSessionDonationStatus, type DonationStatusResponse } from '@/lib/api/payment'

interface Props {
  sessionId: number
  onDonate: () => void
  /** Incrémenter pour forcer un rafraîchissement (ex: après un don réussi). */
  refreshKey?: number
}

export default function DonationStatus({ sessionId, onDonate, refreshKey = 0 }: Props) {
  const [data, setData] = useState<DonationStatusResponse | null>(null)

  useEffect(() => {
    getSessionDonationStatus(sessionId).then(setData).catch(() => {})
  }, [sessionId, refreshKey])

  // Le mentor n'accepte pas les dons → on n'affiche rien.
  if (!data || !data.mentorReady) return null

  // Un don abouti ou en cours de confirmation (webhook) : on remercie, sans reproposer.
  const status = data.payment?.status
  const donationDone = !!status && status !== 'failed' && status !== 'canceled'

  if (donationDone) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Heart className="h-3.5 w-3.5 fill-current" />
        Don envoyé — merci !
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onDonate}
      className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
    >
      <Heart className="h-3 w-3" />
      Soutenir votre mentor
    </button>
  )
}
