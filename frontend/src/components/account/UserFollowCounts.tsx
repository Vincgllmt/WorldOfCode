'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { UserMinus } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useFollowers, useFollowing, useUnfollowUser } from '@/hooks/useFollow'
import { useUserPosts } from '@/hooks/useUserProfile'

type UserFollowCountsProps = {
  userId: number
  isOwnProfile?: boolean
}

const sortByUsername = <T extends { username: string }>(list: T[] | undefined): T[] =>
  [...(list ?? [])].sort((a, b) =>
    a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' }),
  )

const getInitials = (username: string): string => {
  if (!username) return ''
  const parts = username.trim().split(/\s+/u)
  if (parts.length === 1) return parts[0]?.slice(0, 2)?.toUpperCase() ?? ''
  const [first, second] = parts
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase()
}

export default function UserFollowCounts({ userId, isOwnProfile = false }: UserFollowCountsProps) {
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false)
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false)

  const { followers, isLoading: followersLoading, error: followersError } = useFollowers(userId)
  const { following, isLoading: followingLoading, error: followingError } = useFollowing(userId)
  const { posts, isLoading: postsLoading, error: postsError } = useUserPosts(userId)
  const { mutate: unfollowUser, isPending: isUnfollowing } = useUnfollowUser()

  const followersList = useMemo(() => sortByUsername(followers), [followers])
  const followingList = useMemo(() => sortByUsername(following), [following])

  const totalPosts = posts.length
  const totalFollowers = followersList.length
  const totalFollowing = followingList.length

  const isLoading = followersLoading || followingLoading || postsLoading
  const hasError = followersError || followingError || postsError

  if (isLoading) {
    return <Skeleton className="h-5 w-64" />
  }

  if (hasError) {
    return (
      <p className="text-sm text-destructive">
        Impossible de récupérer les compteurs pour le moment.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">
        {totalPosts} publication{totalPosts > 1 ? 's' : ''}
      </span>
      <span aria-hidden>•</span>
      <Dialog open={followersDialogOpen} onOpenChange={setFollowersDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-sm font-medium text-foreground"
          >
            {totalFollowers} follower{totalFollowers > 1 ? 's' : ''}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>Followers</DialogTitle>
          {followersList.length > 0 ? (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {followersList.map((follower) => (
                <li key={follower.id}>
                  <Link
                    href={`/user/${follower.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <Avatar className="h-8 w-8 border border-border/70">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(follower.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{follower.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun follower pour le moment.
            </p>
          )}
        </DialogContent>
      </Dialog>
      <span aria-hidden>•</span>
      <Dialog open={followingDialogOpen} onOpenChange={setFollowingDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-sm font-medium text-foreground"
          >
            {totalFollowing} suivi(e)s
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>Utilisateurs suivi(e)s</DialogTitle>
          {followingList.length > 0 ? (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {followingList.map((user) => (
                <li key={user.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                  <Link
                    href={`/user/${user.id}`}
                    className="flex flex-1 items-center gap-3"
                  >
                    <Avatar className="h-8 w-8 border border-border/70">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.username}</span>
                  </Link>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => unfollowUser(user.id)}
                      disabled={isUnfollowing}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-500 disabled:opacity-50"
                      title={`Ne plus suivre ${user.username}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun utilisateur suivi pour le moment.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
