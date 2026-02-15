import { Badge } from '@/components/ui/badge'
import PostContent from '@/components/post/PostContent'
import type { Post } from '@/interfaces/post'

type SharedPostCardProps = {
  readonly post: Post
}

export default function SharedPostCard({ post }: SharedPostCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-card-foreground">{post.authorUsername}</div>
          <div className="text-xs text-muted-foreground">
            Publication originale • {post.techGroupName}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
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
  )
}
