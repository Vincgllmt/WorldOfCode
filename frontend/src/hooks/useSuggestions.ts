import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSuggestedUsers } from '@/services/suggestionService'
import type { SuggestedUser } from '@/interfaces/suggestion'

// Hook simple pour la page /suggestions (mode liste)
export const useSuggestedUsers = (limit: number = 5) => {
  const { data, isLoading, error } = useQuery<SuggestedUser[]>({
    queryKey: ['suggested-users', limit],
    queryFn: () => getSuggestedUsers(limit, 0),
    staleTime: 5 * 60 * 1000,
  })

  return { suggestedUsers: data ?? [], isLoading, error }
}

// Hook pour le swipe deck avec buffer et pagination infinie
export const useSwipeSuggestions = (batchSize: number = 5) => {
  const [cards, setCards] = useState<SuggestedUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const seenIds = useRef<Set<number>>(new Set())

  // Fetch le batch courant
  const { data, isLoading, isFetching } = useQuery<SuggestedUser[]>({
    queryKey: ['suggested-users-swipe', batchSize, offset],
    queryFn: () => getSuggestedUsers(batchSize, offset),
    staleTime: 60 * 1000,
  })

  // Quand les donnees arrivent, ajouter au buffer
  useEffect(() => {
    if (!data) return

    if (data.length === 0 && offset > 0) {
      // Plus de resultats, on boucle en resetant
      seenIds.current.clear()
      setOffset(0)
      setCurrentIndex(0)
      setCards([])
      return
    }

    // Filtrer les doublons deja dans le buffer
    const newCards = data.filter((u) => !seenIds.current.has(u.id))
    newCards.forEach((u) => seenIds.current.add(u.id))

    if (newCards.length > 0) {
      setCards((prev) => [...prev, ...newCards])
    }

    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [data, offset, isInitialized])

  // Avancer d'une carte
  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1
      // Prefetch quand il reste 2 cartes ou moins
      const remaining = cards.length - next
      if (remaining <= 2 && !isFetching) {
        setOffset((prevOffset) => prevOffset + batchSize)
      }
      return next
    })
  }, [cards.length, isFetching, batchSize])

  // Cartes restantes a afficher
  const visibleCards = cards.slice(currentIndex, currentIndex + 3)
  const hasCards = visibleCards.length > 0

  return {
    visibleCards,
    hasCards,
    isLoading: isLoading && !isInitialized,
    advance,
  }
}
