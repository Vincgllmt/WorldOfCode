'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getUserById } from '@/services/userService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import StepperProgress, { type StepDefinition } from './StepperProgress'
import StepBioInfo from './StepBioInfo'
import StepExperiences from './StepExperiences'
import StepSkills from './StepSkills'
import StepLinks from './StepLinks'
import StepGroups from './StepGroups'
import StepNavigation from './StepNavigation'
import type { PublicUser } from '@/interfaces/user'

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
  const { user: authUser } = useAuth()

  const { data: profile, isLoading: profileLoading, dataUpdatedAt } = useQuery<PublicUser>({
    queryKey: ['user', authUser?.id, 'profile-onboarding'],
    queryFn: () => getUserById(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: 0,
  })

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

  const handleSkipAll = () => {
    router.push('/home')
  }

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  const profileKey = `${currentStep}-${dataUpdatedAt}`

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepBioInfo key={profileKey} onSuccess={handleNext} setIsSubmitting={setIsSubmitting} profile={profile} />
      case 1:
        return <StepExperiences key={profileKey} onSuccess={handleNext} setIsSubmitting={setIsSubmitting} profile={profile} />
      case 2:
        return <StepSkills key={profileKey} onSuccess={handleNext} setIsSubmitting={setIsSubmitting} profile={profile} />
      case 3:
        return <StepLinks key={profileKey} onSuccess={handleNext} setIsSubmitting={setIsSubmitting} profile={profile} />
      case 4:
        return <StepGroups key={profileKey} onSuccess={handleNext} setIsSubmitting={setIsSubmitting} />
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
        onSkipAll={handleSkipAll}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
