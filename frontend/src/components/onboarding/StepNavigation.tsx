'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, SkipForward, ChevronsRight } from 'lucide-react'

type StepNavigationProps = {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onSkip: () => void
  onSkipAll: () => void
  isSubmitting: boolean
}

export default function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onSkip,
  onSkipAll,
  isSubmitting,
}: StepNavigationProps) {
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="flex items-center justify-between">
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

      <div className="flex items-center gap-2">
        {!isLastStep && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkipAll}
            disabled={isSubmitting}
            className="gap-2 text-muted-foreground"
          >
            <ChevronsRight className="h-4 w-4" />
            Tout passer
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isSubmitting}
          className="gap-2 text-muted-foreground"
        >
          <SkipForward className="h-4 w-4" />
          Passer
        </Button>
      </div>
    </div>
  )
}
