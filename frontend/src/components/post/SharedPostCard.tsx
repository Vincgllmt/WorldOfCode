import { Badge } from '@/components/ui/badge'
import PostContent from '@/components/post/PostContent'
import type { Post } from '@/interfaces/post'

type SharedPostCardProps = {
  readonly post: Post
}

export default function SharedPostCard({ post }: SharedPostCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{post.authorUsername}</div>
          <div className="text-xs text-slate-500">
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
        <p className="mt-3 text-sm text-slate-600">Pas de contenu textuel pour cette publication.</p>
      )}

      {post.sharedPost ? (
        <p className="mt-3 text-xs text-slate-500">
          Cette publication était déjà un partage. Seule la publication immédiate est affichée pour éviter une
          boucle infinie.
        </p>
      ) : null}
    </article>
  )
}
