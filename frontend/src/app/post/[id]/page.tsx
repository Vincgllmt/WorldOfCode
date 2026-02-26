'use client'

import { useParams } from 'next/navigation'
import { usePost } from '@/hooks/usePosts'
import PostItem from '@/components/post/PostItem'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PostPage() {
    const { id } = useParams()
    const postId = Number(id)

    const { data: post, isLoading, error } = usePost(postId)

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto p-4 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="max-w-2xl mx-auto p-4 text-center space-y-4">
                <p className="text-muted-foreground">Ce post est introuvable ou a été supprimé.</p>
                <Link href="/home">
                    <Button variant="outline">Retour au fil</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            <Link
                href={`/group/${post.techGroupId}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour au groupe {post.techGroupName}
            </Link>

            <PostItem post={post} defaultShowComments />
        </div>
    )
}
