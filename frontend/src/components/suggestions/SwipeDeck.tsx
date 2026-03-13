'use client'

import { useState, useCallback } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'
import SwipeCard from './SwipeCard'
import { useFollowUser } from '@/hooks/useFollow'
import type { SuggestedUser } from '@/interfaces/suggestion'

const SWIPE_THRESHOLD = 80
const SWIPE_EXIT_X = 300

interface SwipeDeckProps {
  cards: SuggestedUser[]
  currentUserId: number
  onSwipe: () => void
}

function DraggableCard({
  user,
  onSwipeComplete,
}: {
  user: SuggestedUser
  onSwipeComplete: (direction: 'left' | 'right') => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeComplete('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeComplete('left')
    }
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      style={{ x, rotate }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Overlay vert (follow) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-green-500/15"
        style={{ opacity: rightOpacity }}
      >
        <div className="rounded-full bg-green-500 p-2">
          <Check className="h-6 w-6 text-white" />
        </div>
      </motion.div>

      {/* Overlay rouge (skip) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-red-500/15"
        style={{ opacity: leftOpacity }}
      >
        <div className="rounded-full bg-red-500 p-2">
          <X className="h-6 w-6 text-white" />
        </div>
      </motion.div>

      <SwipeCard user={user} />
    </motion.div>
  )
}

export default function SwipeDeck({ cards, currentUserId, onSwipe }: SwipeDeckProps) {
  const { mutate: followUser, isPending: isFollowing } = useFollowUser()
  const [swiping, setSwiping] = useState(false)

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (cards.length === 0 || swiping) return
      setSwiping(true)

      const topCard = cards[0]
      if (direction === 'right' && topCard) {
        followUser(topCard.id)
      }

      setTimeout(() => {
        onSwipe()
        setSwiping(false)
      }, 150)
    },
    [cards, followUser, onSwipe, swiping]
  )

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-3">
      {/* Stack de cartes */}
      <div className="relative min-h-[280px] w-full overflow-hidden">
        <AnimatePresence mode="popLayout">
          {cards
            .slice(0, 3)
            .reverse()
            .map((user, reverseIndex) => {
              const stackIndex = Math.min(cards.length, 3) - 1 - reverseIndex
              const isTop = stackIndex === 0

              if (isTop) {
                return (
                  <DraggableCard
                    key={user.id}
                    user={user}
                    onSwipeComplete={handleSwipe}
                  />
                )
              }

              // Cartes derriere
              return (
                <motion.div
                  key={user.id}
                  className="absolute inset-0 pointer-events-none"
                  initial={false}
                  animate={{
                    scale: 1 - stackIndex * 0.05,
                    y: stackIndex * 6,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <SwipeCard user={user} />
                </motion.div>
              )
            })}
        </AnimatePresence>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => handleSwipe('left')}
          disabled={isFollowing || swiping || cards.length === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-300 text-red-500 transition-all hover:bg-red-50 hover:border-red-400 hover:scale-110 active:scale-95 disabled:opacity-50"
          aria-label="Ignorer"
          title="Ignorer"
        >
          <X className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => handleSwipe('right')}
          disabled={isFollowing || swiping || cards.length === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-300 text-green-500 transition-all hover:bg-green-50 hover:border-green-400 hover:scale-110 active:scale-95 disabled:opacity-50"
          aria-label="Suivre"
          title="Suivre"
        >
          {isFollowing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
