'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Experience } from '@/interfaces/user'

type Props = {
  experience: Experience
}

export default function SortableExperienceItem({ experience }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: experience.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 transition-opacity ${isDragging ? 'opacity-40 shadow-lg' : 'opacity-100'}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{experience.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {experience.company}
          {experience.startDate && ` · ${experience.startDate}`}
        </p>
      </div>
    </div>
  )
}
