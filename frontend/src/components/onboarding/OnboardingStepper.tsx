'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepperProgress, { type StepDefinition } from './StepperProgress'
import StepBioInfo from './StepBioInfo'
import StepExperiences from './StepExperiences'
import StepSkills from './StepSkills'
import StepLinks from './StepLinks'
import StepGroups from './StepGroups'
import StepNavigation from './StepNavigation'

const STEPS: StepDefinition[] = [
  { label: 'Bio & Infos', description: 'Présentez-vous en quelques mots' },
  { label: 'Expériences', description: 'Ajoutez vos expériences professionnelles' },
  { label: 'Compétences', description: 'Sélectionnez vos compétences techniques' },
  { label: 'Liens', description: 'Partagez vos profils en ligne' },
  { label: 'Groupes', description: 'Rejoignez des groupes qui vous intéressent' },
]

export default function OnboardingStepper() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const isLastStep = currentStep === STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      router.push('/home')
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleSkip = () => {
    handleNext()
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepBioInfo onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
      case 1:
        return <StepExperiences onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
      case 2:
        return <StepSkills onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
      case 3:
        return <StepLinks onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
      case 4:
        return <StepGroups onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <StepperProgress steps={STEPS} currentStep={currentStep} />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            {STEPS[currentStep].label}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      <StepNavigation
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onBack={handleBack}
        onSkip={handleSkip}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
