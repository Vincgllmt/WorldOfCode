'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import SortableExperienceItem from './SortableExperienceItem'
import type { Experience } from '@/interfaces/user'

type Props = {
  experiences: Experience[]
  userId: number
  onReorder: (orderedIds: string[]) => void
}

export default function ExperienceDndList({ experiences, userId, onReorder }: Props) {
  const [items, setItems] = useState<Experience[]>(experiences)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((e) => e.id === active.id)
    const newIndex = items.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    onReorder(reordered.map((e) => e.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((exp) => (
            <SortableExperienceItem key={exp.id} experience={exp} userId={userId} isEditMode />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
