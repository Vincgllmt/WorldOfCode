'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFollowers, useFollowing } from '@/hooks/useFollow'
import { useUserPosts } from '@/hooks/useUserProfile'

type UserFollowCountsProps = {
  userId: number
}

const sortByUsername = <T extends { username: string }>(list: T[] | undefined): T[] =>
  [...(list ?? [])].sort((a, b) =>
    a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' }),
  )

export default function UserFollowCounts({ userId }: UserFollowCountsProps) {
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false)
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false)

  const { followers, isLoading: followersLoading, error: followersError } = useFollowers(userId)
  const { following, isLoading: followingLoading, error: followingError } = useFollowing(userId)
  const { posts, isLoading: postsLoading, error: postsError } = useUserPosts(userId)

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
                <li
                  key={follower.id}
                  className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground"
                >
                  {follower.username}
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
                <li
                  key={user.id}
                  className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground"
                >
                  {user.username}
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
