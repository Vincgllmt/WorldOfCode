'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, SkipForward } from 'lucide-react'

type StepNavigationProps = {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onSkip: () => void
  isSubmitting: boolean
}

export default function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onSkip,
  isSubmitting,
}: StepNavigationProps) {
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={currentStep === 0}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onSkip}
        disabled={isSubmitting}
        className="gap-2 text-muted-foreground"
      >
        <SkipForward className="h-4 w-4" />
        {isLastStep ? 'Terminer sans enregistrer' : 'Passer'}
      </Button>
    </div>
  )
}
