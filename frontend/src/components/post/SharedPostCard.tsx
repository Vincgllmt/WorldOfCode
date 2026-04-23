'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import PostContent from '@/components/post/PostContent'
import type { Post } from '@/interfaces/post'

type SharedPostCardProps = {
  readonly post: Post
}

function getInitials(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

export default function SharedPostCard({ post }: SharedPostCardProps) {
  const router = useRouter()
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/post/${post.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/post/${post.id}`)}
      className="block cursor-pointer"
    >
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/user/${post.authorId}`}
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center shrink-0"
            >
              {post.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.authorAvatarUrl}
                  alt={`Avatar de ${post.authorUsername}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-primary select-none">
                  {getInitials(post.authorUsername)}
                </span>
              )}
            </Link>
            <div>
              <Link
                href={`/user/${post.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-card-foreground hover:underline hover:text-primary transition"
              >
                {post.authorUsername}
              </Link>
              <div className="text-xs text-muted-foreground">
                Publication originale • {post.techGroupName}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {post.techGroupName}
          </Badge>
        </div>

        {post.content ? (
          <PostContent content={post.content} className="mt-3" />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Pas de contenu textuel pour cette publication.</p>
        )}

        {post.sharedPost ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Cette publication était déjà un partage. Seule la publication immédiate est affichée pour éviter une
            boucle infinie.
          </p>
        ) : null}
      </article>
    </div>
  )
}
