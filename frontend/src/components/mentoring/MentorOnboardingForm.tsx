'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { createMentorProfile } from '@/lib/api/mentoring/profile'
import type { Skill } from '@/types/mentoring'

const TEACHING_STYLES = [
  { value: 'guided', label: 'Guide sans donner les réponses' },
  { value: 'direct', label: 'Explications directes et réponses' },
  { value: 'socratic', label: 'Méthode socratique (questions)' },
  { value: 'collaborative', label: 'Travail collaboratif' },
]

interface Props {
  onSuccess: () => void
}

export default function MentorOnboardingForm({ onSuccess }: Props) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null)
  const [teachingStyle, setTeachingStyle] = useState('')
  const [maxActiveMentees, setMaxActiveMentees] = useState(3)
  const [mentorBio, setMentorBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maxError, setMaxError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/skills')
      .then(r => r.json())
      .then((data: Skill[]) => {
        setSkills(data)
        setSkillsLoading(false)
      })
      .catch(() => {
        setSkillsLoading(false)
        setSkillsError(true)
      })
  }, [])

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleMaxChange = (value: number) => {
    setMaxActiveMentees(value)
    if (value < 1 || value > 10) {
      setMaxError('La valeur doit être entre 1 et 10.')
    } else {
      setMaxError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (maxActiveMentees < 1 || maxActiveMentees > 10) return
    if (selectedSkills.length === 0) {
      setSpecialtiesError('Veuillez sélectionner au moins une spécialité.')
      return
    }
    setSpecialtiesError(null)
    setError(null)
    setLoading(true)
    try {
      await createMentorProfile({
        specialties: selectedSkills,
        teachingStyle: teachingStyle || undefined,
        maxActiveMentees,
        mentorBio: mentorBio || undefined,
      })
      onSuccess()
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        onSuccess()
        return
      }
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Spécialités */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Spécialités technologiques
        </label>
        {skillsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des compétences...</p>
        ) : skillsError ? (
          <p role="alert" className="text-sm text-destructive flex items-center gap-1">
            <span aria-hidden="true">⚠</span> Impossible de charger les compétences. Rechargez la page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                aria-pressed={selectedSkills.includes(skill.id)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedSkills.includes(skill.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                {selectedSkills.includes(skill.id) ? '✓ ' : ''}{skill.name}
              </button>
            ))}
          </div>
        )}
        {specialtiesError && (
          <p role="alert" className="text-destructive text-sm flex items-center gap-1 mt-1">
            <span aria-hidden="true">⚠</span> {specialtiesError}
          </p>
        )}
      </div>

      {/* Style pédagogique */}
      <div>
        <label htmlFor="teachingStyle" className="block text-sm font-medium mb-2">
          Style pédagogique
        </label>
        <select
          id="teachingStyle"
          value={teachingStyle}
          onChange={e => setTeachingStyle(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        >
          <option value="">Choisir un style (optionnel)</option>
          {TEACHING_STYLES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Charge maximale */}
      <div>
        <label htmlFor="maxActiveMentees" className="block text-sm font-medium mb-2">
          Nombre max de mentorés simultanés (1-10)
        </label>
        <input
          id="maxActiveMentees"
          type="number"
          min={1}
          max={10}
          value={maxActiveMentees}
          onChange={e => handleMaxChange(Number(e.target.value))}
          aria-describedby={maxError ? 'maxError' : undefined}
          aria-invalid={!!maxError}
          className={`w-24 rounded-md border bg-background px-3 py-2 ${
            maxError ? 'border-destructive' : 'border-border'
          }`}
        />
        {maxError && (
          <p id="maxError" role="alert" className="text-destructive text-sm flex items-center gap-1 mt-1">
            <span aria-hidden="true">⚠</span> {maxError}
          </p>
        )}
      </div>

      {/* Bio mentor */}
      <div>
        <label htmlFor="mentorBio" className="block text-sm font-medium mb-2">
          Bio mentor (optionnel)
        </label>
        <textarea
          id="mentorBio"
          value={mentorBio}
          onChange={e => setMentorBio(e.target.value)}
          rows={3}
          placeholder="Décrivez votre approche du mentorat..."
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm flex items-center gap-2">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || skillsLoading || !!maxError}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium disabled:opacity-50"
      >
        {loading ? 'Création en cours...' : 'Devenir Mentor'}
      </button>
    </form>
  )
}
