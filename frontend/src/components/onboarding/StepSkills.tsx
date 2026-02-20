'use client'

import { useState, useMemo } from 'react'
import { useSkills, useUpdateSkills } from '@/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import type { Skill, SkillCategory } from '@/interfaces/user'
import toast from 'react-hot-toast'
import { ArrowRight, Check, X } from 'lucide-react'

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'Langages',
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  database: 'Bases de données',
  devops: 'DevOps',
  cloud: 'Cloud',
  design: 'Design',
  tools: 'Outils',
  testing: 'Tests',
  security: 'Sécurité',
  data: 'Data',
  other: 'Autre',
}

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
}

export default function StepSkills({ onSuccess, setIsSubmitting }: Props) {
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const { data: skills, isLoading } = useSkills()
  const updateSkills = useUpdateSkills()

  const skillsByCategory = useMemo(() => {
    if (!skills) return {}
    return skills.reduce<Record<string, Skill[]>>((acc, skill) => {
      const cat = skill.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(skill)
      return acc
    }, {})
  }, [skills])

  const selectedSkills = useMemo(() => {
    if (!skills) return []
    return skills.filter((s) => selectedSkillIds.includes(s.id))
  }, [skills, selectedSkillIds])

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    )
  }

  const removeSkill = (skillId: number) => {
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId))
  }

  const onSubmit = async () => {
    if (selectedSkillIds.length === 0) {
      onSuccess()
      return
    }

    setIsSubmitting(true)
    try {
      await updateSkills.mutateAsync(selectedSkillIds)
      toast.success('Compétences enregistrées')
      onSuccess()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <Badge key={skill.id} variant="secondary" className="gap-1 pr-1">
              {skill.name}
              <button
                type="button"
                onClick={() => removeSkill(skill.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Command className="border">
        <CommandInput placeholder="Rechercher une compétence..." />
        <CommandList className="max-h-64">
          <CommandEmpty>Aucune compétence trouvée.</CommandEmpty>
          {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
            <CommandGroup
              key={category}
              heading={CATEGORY_LABELS[category as SkillCategory] || category}
            >
              {categorySkills.map((skill) => {
                const isSelected = selectedSkillIds.includes(skill.id)
                return (
                  <CommandItem
                    key={skill.id}
                    value={skill.name}
                    keywords={[category]}
                    onSelect={() => toggleSkill(skill.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{skill.name}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>

      <p className="text-xs text-muted-foreground text-center">
        {selectedSkillIds.length} compétence{selectedSkillIds.length !== 1 ? 's' : ''} sélectionnée{selectedSkillIds.length !== 1 ? 's' : ''}
      </p>

      <Button
        type="button"
        onClick={onSubmit}
        className="w-full gap-2"
        disabled={updateSkills.isPending}
      >
        {updateSkills.isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
        {!updateSkills.isPending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}
