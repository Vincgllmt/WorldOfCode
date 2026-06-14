'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { createMentorProfile } from '@/lib/api/mentoring/profile'
interface TechGroup { id: number; name: string }

const SUGGESTIONS_COUNT = 8

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
  const [skills, setSkills] = useState<TechGroup[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null)
  const [skillSearch, setSkillSearch] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('')
  const [maxActiveMentees, setMaxActiveMentees] = useState(3)
  const [mentorBio, setMentorBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/group')
      .then(r => r.json())
      .then((data: TechGroup[]) => {
        setSkills(data)
        setSkillsLoading(false)
      })
      .catch(() => {
        setSkillsLoading(false)
        setSkillsError(true)
      })
  }, [])

  const unselectedSkills = useMemo(
    () => skills.filter(s => !selectedSkills.includes(s.id)),
    [skills, selectedSkills]
  )

  const visibleSkills = useMemo(() => {
    const term = skillSearch.trim().toLowerCase()
    if (!term) return unselectedSkills.slice(0, SUGGESTIONS_COUNT)
    return unselectedSkills.filter(s => s.name.toLowerCase().includes(term))
  }, [unselectedSkills, skillSearch])

  const selectedSkillObjects = useMemo(
    () => skills.filter(s => selectedSkills.includes(s.id)),
    [skills, selectedSkills]
  )

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <p className="text-xs text-muted-foreground">
        Les champs marqués d&apos;un <span className="text-destructive font-semibold">*</span> sont obligatoires.
      </p>

      {/* Spécialités */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Spécialités technologiques <span className="text-destructive">*</span>
        </label>

        {skillsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des compétences...</p>
        ) : skillsError ? (
          <p role="alert" className="text-sm text-destructive flex items-center gap-1">
            <span aria-hidden="true">⚠</span> Impossible de charger les compétences. Rechargez la page.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Chips des sélectionnés */}
            {selectedSkillObjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkillObjects.map(skill => (
                  <span
                    key={skill.id}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary text-primary-foreground"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      aria-label={`Retirer ${skill.name}`}
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une technologie..."
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Suggestions / résultats de recherche */}
            <div className="flex flex-wrap gap-2">
              {visibleSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune technologie trouvée.</p>
              ) : (
                visibleSkills.map(skill => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => { toggleSkill(skill.id); setSkillSearch('') }}
                    className="px-3 py-1 rounded-full text-sm border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {skill.name}
                  </button>
                ))
              )}
            </div>

            {!skillSearch && unselectedSkills.length > SUGGESTIONS_COUNT && (
              <p className="text-xs text-muted-foreground">
                +{unselectedSkills.length - SUGGESTIONS_COUNT} autres — utilisez la recherche pour les trouver.
              </p>
            )}
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
          Style pédagogique <span className="text-muted-foreground font-normal">(optionnel)</span>
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
        <label className="block text-sm font-medium mb-2">
          Mentorés actifs max <span className="text-destructive">*</span> — <span className="text-primary">{maxActiveMentees}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={maxActiveMentees}
          onChange={e => setMaxActiveMentees(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>1</span><span>5</span><span>10</span>
        </div>
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
        disabled={loading || skillsLoading}
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium disabled:opacity-50"
      >
        {loading ? 'Création en cours...' : 'Devenir Mentor'}
      </button>
    </form>
  )
}
