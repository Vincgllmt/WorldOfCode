'use client'

import { useState } from 'react'
import RequestTypeBadge from './RequestTypeBadge'
import PinTimer from '../cockpit/PinTimer'
import AcceptRequestModal from '../cockpit/AcceptRequestModal'
import { pinRequest, unpinRequest } from '@/lib/api/mentoring/requests'
import type { MentoringRequest, MentoringSession } from '@/types/mentoring'

interface Props {
  request: MentoringRequest
  isSelected: boolean
  onClick: () => void
  onRefetch: () => void
  onSessionAccepted?: () => void
}

export default function MentoringRequestCard({ request, isSelected, onClick, onRefetch, onSessionAccepted }: Props) {
  const [pinning, setPinning] = useState(false)
  const [localPin, setLocalPin] = useState(request.pin ?? null)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPinning(true)
    setPinError(null)
    try {
      const pin = await pinRequest(request.id)
      setLocalPin({ expiresAt: pin.expiresAt, isActive: true })
      onRefetch()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'REQUEST_ALREADY_PINNED') {
        setPinError('Déjà réservée par un autre mentor.')
      }
    } finally {
      setPinning(false)
    }
  }

  const handleUnpin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPinning(true)
    try {
      await unpinRequest(request.id)
      setLocalPin(null)
      onRefetch()
    } catch {
      // ne pas vider localPin si le dépingage échoue
    } finally {
      setPinning(false)
    }
  }

  return (
    <>
    <article
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar junior */}
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {request.junior.username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{request.junior.username}</p>
            <h3 className="font-medium text-sm leading-tight">{request.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RequestTypeBadge type={request.type} />
          <span className="text-xs font-semibold text-primary">{request.compatibilityScore}%</span>
        </div>
      </div>

      {/* Extrait description */}
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {request.descriptionExcerpt ?? request.description}
      </p>

      {/* Tags + actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 bg-muted text-xs rounded-full">{request.techStack}</span>

        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
          {pinError && (
            <span role="alert" className="text-xs text-destructive flex items-center gap-1">
              <span aria-hidden="true">⚠</span> {pinError}
            </span>
          )}
          {localPin?.isActive ? (
            <>
              <PinTimer expiresAt={localPin.expiresAt} onExpired={() => setLocalPin(null)} />
              <button
                onClick={handleUnpin}
                disabled={pinning}
                className="text-xs text-muted-foreground underline disabled:opacity-50"
              >
                Désépingler
              </button>
            </>
          ) : (
            <button
              onClick={handlePin}
              disabled={pinning || request.status === 'pinned'}
              className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {pinning ? 'Épinglage...' : '📌 Épingler'}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); setShowAcceptModal(true) }}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </article>

    {showAcceptModal && (
      <AcceptRequestModal
        requestId={request.id}
        requestTitle={request.title}
        onClose={() => setShowAcceptModal(false)}
        onAccepted={(_session: MentoringSession) => {
          setShowAcceptModal(false)
          onRefetch()
          onSessionAccepted?.()
        }}
      />
    )}
    </>
  )
}
