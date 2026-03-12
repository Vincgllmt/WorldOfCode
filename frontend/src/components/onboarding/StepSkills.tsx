'use client'

import { useState, useMemo } from 'react'
import { useSkills, useUpdateSkills } from '@/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Skill, SkillCategory } from '@/interfaces/user'
import toast from 'react-hot-toast'
import { ArrowRight, Check, X, Search } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/profile-constants'
import type { PublicUser } from '@/interfaces/user'

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
  profile?: PublicUser
}

export default function StepSkills({ onSuccess, setIsSubmitting, profile }: Props) {
  const existingSkillIds = (profile?.skills ?? []).map((s) => s.id)
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>(existingSkillIds)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: skills, isLoading } = useSkills()
  const updateSkills = useUpdateSkills()

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const filteredByCategory = useMemo(() => {
    if (!skills) return {}
    const filtered = normalizedSearch.length === 0
      ? skills
      : skills.filter((skill) =>
          skill.name.toLowerCase().includes(normalizedSearch) ||
          skill.category.toLowerCase().includes(normalizedSearch) ||
          (CATEGORY_LABELS[skill.category as SkillCategory] ?? '').toLowerCase().includes(normalizedSearch)
        )
    return filtered.reduce<Record<string, Skill[]>>((acc, skill) => {
      const cat = skill.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(skill)
      return acc
    }, {})
  }, [skills, normalizedSearch])

  const totalFiltered = Object.values(filteredByCategory).reduce((sum, arr) => sum + arr.length, 0)

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

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une compétence..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Skills list grouped by category */}
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {totalFiltered === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune compétence trouvée.
          </p>
        ) : (
          <div className="p-1">
            {Object.entries(filteredByCategory).map(([category, categorySkills]) => (
              <div key={category} className="mb-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {CATEGORY_LABELS[category as SkillCategory] ?? category}
                </div>
                {categorySkills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id)
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className="relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none transition hover:bg-accent hover:text-accent-foreground"
                    >
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
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

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
