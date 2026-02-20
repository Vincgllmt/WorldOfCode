import { Github, Globe, Link2, Linkedin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Availability, LinkType, SkillCategory } from '@/interfaces/user'

// === Availability ===

export const AVAILABILITY_CONFIG: Record<
  Availability,
  { label: string; badgeClass: string; dotClass?: string }
> = {
  open_to_work: {
    label: "En recherche d'emploi",
    badgeClass: 'border-green-200 bg-green-50 text-green-700',
    dotClass: 'bg-green-500',
  },
  employed: {
    label: 'En poste',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  freelance: {
    label: 'Freelance',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  student: {
    label: 'Étudiant',
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
  },
}

// Tableau compatible avec les composants Select de l'onboarding
export const AVAILABILITY_OPTIONS = Object.entries(AVAILABILITY_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)

// === Links ===

export const LINK_CONFIG: Record<LinkType, { label: string; placeholder: string; icon: LucideIcon }> = {
  github: { label: 'GitHub', placeholder: 'https://github.com/username', icon: Github },
  gitlab: { label: 'GitLab', placeholder: 'https://gitlab.com/username', icon: Github },
  linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', icon: Linkedin },
  portfolio: { label: 'Portfolio', placeholder: 'https://mon-portfolio.dev', icon: Globe },
  other: { label: 'Autre', placeholder: 'https://...', icon: Link2 },
}

// === Skill categories ===

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
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
