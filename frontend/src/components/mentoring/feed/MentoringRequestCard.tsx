'use client'

import { useState } from 'react'
import { Star, Target } from 'lucide-react'
import RequestTypeBadge from './RequestTypeBadge'
import PinTimer from '../cockpit/PinTimer'
import AcceptRequestModal from '../cockpit/AcceptRequestModal'
import { pinRequest, unpinRequest } from '@/lib/api/mentoring/requests'
import type { MentoringRequest, MentoringSession, Skill } from '@/types/mentoring'

interface Props {
  request: MentoringRequest
  isSelected: boolean
  onClick: () => void
  onRefetch: () => void
  onSessionAccepted?: () => void
  mentorSpecialties?: Skill[]
}

export default function MentoringRequestCard({ request, isSelected, onClick, onRefetch, onSessionAccepted, mentorSpecialties = [] }: Props) {
  const [pinning, setPinning] = useState(false)

  const isInSpecialty = mentorSpecialties.some(s =>
    request.techStack.toLowerCase().includes(s.name.toLowerCase()) ||
    s.name.toLowerCase().includes(request.techStack.toLowerCase())
  )
  const [localPin, setLocalPin] = useState(request.pin ?? null)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [accepted, setAccepted] = useState(false)
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
        request.isTargeted
          ? isSelected
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-violet-500/60 bg-violet-500/5 hover:border-violet-500'
          : isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
      }`}
    >
      {request.isTargeted && (
        <div className="flex items-center gap-1.5 mb-2 text-violet-400 text-xs font-semibold">
          <Target className="h-3.5 w-3.5" />
          Demande ciblée — pour vous
        </div>
      )}
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
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 text-xs rounded-full ${isInSpecialty ? 'bg-primary/10 text-primary font-medium' : 'bg-muted'}`}>
            {request.techStack}
          </span>
          {isInSpecialty && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              <Star className="h-3 w-3 fill-primary" />
              Ma spécialité
            </span>
          )}
          {request.codeSnippet && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-mono">
              {'</>'}
            </span>
          )}
        </div>

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
            onClick={e => { e.stopPropagation(); if (!accepted) setShowAcceptModal(true) }}
            disabled={accepted}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              accepted
                ? 'bg-muted text-muted-foreground cursor-default'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {accepted ? '✓ Acceptée' : 'Accepter'}
          </button>
        </div>
      </div>
    </article>

    {showAcceptModal && (
      <AcceptRequestModal
        requestId={request.id}
        requestTitle={request.title}
        juniorId={request.junior.id}
        onClose={() => setShowAcceptModal(false)}
        onAccepted={(_session: MentoringSession) => {
          setAccepted(true)
          setShowAcceptModal(false)
          onRefetch()
          onSessionAccepted?.()
        }}
      />
    )}
    </>
  )
}
