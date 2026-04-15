'use client'

import { useState } from 'react'
import { createMentoringRequest } from '@/lib/api/mentoring/requests'
import StepTechno from './steps/StepTechno'
import StepBlockedSince from './steps/StepBlockedSince'
import StepAlreadyTried from './steps/StepAlreadyTried'
import StepBehavior from './steps/StepBehavior'
import StepSummary from './steps/StepSummary'

interface FormData {
  techStack: string
  blockedSince: string
  alreadyTried: string
  expectedBehavior: string
  observedBehavior: string
  title: string
  description: string
  type: string
  isPublic: boolean
  targetMentorId?: number
}

const INITIAL_DATA: FormData = {
  techStack: '', blockedSince: '', alreadyTried: '',
  expectedBehavior: '', observedBehavior: '',
  title: '', description: '', type: 'debug', isPublic: true,
}

const TOTAL_STEPS = 5

interface Props {
  onSuccess: () => void
}

export default function RequestFormWizard({ onSuccess }: Props) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(INITIAL_DATA)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (partial: Partial<FormData>) => setData(d => ({ ...d, ...partial }))
  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const prev = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await createMentoringRequest(data)
      onSuccess()
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Indicateur de progression — AC 5 */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          <span aria-hidden="true">📋 </span>Étape {step} sur {TOTAL_STEPS}
        </p>
        <div className="flex gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${i + 1 <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      {/* Étapes — AC 1 */}
      {step === 1 && (
        <StepTechno
          value={data.techStack}
          onChange={v => update({ techStack: v })}
          onNext={next}
        />
      )}
      {step === 2 && (
        <StepBlockedSince
          value={data.blockedSince}
          onChange={v => update({ blockedSince: v })}
          onNext={next}
          onPrev={prev}
        />
      )}
      {step === 3 && (
        <StepAlreadyTried
          value={data.alreadyTried}
          onChange={v => update({ alreadyTried: v })}
          onNext={next}
          onPrev={prev}
        />
      )}
      {step === 4 && (
        <StepBehavior
          expected={data.expectedBehavior}
          observed={data.observedBehavior}
          onChangeExpected={v => update({ expectedBehavior: v })}
          onChangeObserved={v => update({ observedBehavior: v })}
          onNext={next}
          onPrev={prev}
        />
      )}
      {step === 5 && (
        <StepSummary
          data={data}
          onChange={update}
          onPrev={prev}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  )
}
