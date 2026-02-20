'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepDefinition = {
  label: string
  description: string
}

type StepperProgressProps = {
  steps: StepDefinition[]
  currentStep: number
}

export default function StepperProgress({ steps, currentStep }: StepperProgressProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                index < currentStep && 'border-green-600 bg-green-600 text-white',
                index === currentStep && 'border-green-600 bg-white text-green-600',
                index > currentStep && 'border-gray-300 bg-white text-gray-400'
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                'hidden sm:block text-xs font-medium text-center max-w-[80px] truncate',
                index <= currentStep ? 'text-green-700' : 'text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-3 mt-[-1rem] sm:mt-0',
                index < currentStep ? 'bg-green-600' : 'bg-gray-300'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
