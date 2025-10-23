// frontend/src/components/follow/FollowToggleButton.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus, Check } from 'lucide-react'
import { useFollowUser, useUnfollowUser, useFollowing } from '@/hooks/useFollow'
import clsx from 'clsx'

export interface FollowToggleButtonProps {
  /** ID de l'utilisateur courant (connecté) */
  currentUserId: number
  /** ID de l'utilisateur cible à suivre */
  targetUserId: number
  /**
   * Etat initial de suivi (si déjà connu depuis une page profil/liste).
   * Si non fourni, on tentera de l’inférer avec useFollowing(currentUserId).
   */
  initialIsFollowing?: boolean
  /**
   * Style du bouton :
   * - 'solid' : bouton plein (par ex. sur pages “listes”)
   * - 'ghost' : style discret, utile sur des overlays d’image/vidéo
   */
  variant?: 'solid' | 'ghost'
  /** Taille */
  size?: 'sm' | 'md' | 'lg'
  /** Callback quand l’état change */
  onChange?: (next: boolean) => void
  /** Classes additionnelles */
  className?: string
}

/**
 * Bouton “Suivre / Suivi(e)” avec comportement toggle.
 * - Accessibilité: aria-pressed, title, focus ring
 * - Loading: spinner pendant la mutation
 * - Invalidations du cache gérées par les hooks useFollowUser / useUnfollowUser
 */
export default function FollowToggleButton({
  currentUserId,
  targetUserId,
  initialIsFollowing,
  variant = 'solid',
  size = 'md',
  onChange,
  className,
}: FollowToggleButtonProps) {
  const disabledSelf = currentUserId === targetUserId

  // 1) Si l'état initial n'est pas fourni, on l’infère via la liste "following" du user courant
  const shouldInfer = typeof initialIsFollowing === 'undefined'
  const { following } = useFollowing(shouldInfer ? currentUserId : -1)
  const inferred = useMemo(
    () => (shouldInfer ? Boolean(following?.some(u => u.id === targetUserId)) : undefined),
    [shouldInfer, following, targetUserId]
  )

  const [isFollowing, setIsFollowing] = useState<boolean>(initialIsFollowing ?? inferred ?? false)
  useEffect(() => {
    if (typeof initialIsFollowing !== 'undefined') setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])
  useEffect(() => {
    if (shouldInfer && typeof inferred !== 'undefined') setIsFollowing(inferred)
  }, [shouldInfer, inferred])

  // 2) Mutations
  const { mutate: follow, isPending: isFollowingPending } = useFollowUser()
  const { mutate: unfollow, isPending: isUnfollowingPending } = useUnfollowUser()
  const isPending = isFollowingPending || isUnfollowingPending

  const handleToggle = () => {
    if (disabledSelf || isPending) return
    if (isFollowing) {
      unfollow(targetUserId, {
        onSuccess: () => {
          setIsFollowing(false)
          onChange?.(false)
        },
      })
    } else {
      follow(targetUserId, {
        onSuccess: () => {
          setIsFollowing(true)
          onChange?.(true)
        },
      })
    }
  }

  // 3) Styles
  const sizeClasses =
    size === 'sm'
      ? 'h-7 px-3 text-xs'
      : size === 'lg'
      ? 'h-10 px-5 text-base'
      : 'h-8 px-4 text-sm'

  // Variante “ghost” adaptée aux overlays (comme ton screenshot)
  const visualClasses =
    variant === 'ghost'
      ? clsx(
          'backdrop-blur-sm',
          isFollowing
            ? 'bg-white/80 text-gray-900 hover:bg-white/90'
            : 'bg-black/50 text-white hover:bg-black/60'
        )
      : isFollowing
      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={disabledSelf || isPending}
      className={clsx(
        'rounded-full font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2',
        sizeClasses,
        visualClasses,
        className
      )}
      aria-pressed={isFollowing}
      title={isFollowing ? 'Ne plus suivre cet utilisateur' : 'Suivre cet utilisateur'}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isFollowing ? 'Suivi(e)' : 'Suivre'}
    </Button>
  )
}
