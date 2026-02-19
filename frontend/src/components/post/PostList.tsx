'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { InfiniteData } from '@tanstack/react-query'
import type { PaginatedPostsResponse } from '@/interfaces/postPagination'
import { useInfinitePosts } from '@/hooks/useInfinitePosts'
import { usePosts } from '@/hooks/usePosts'
import PostItem from './PostItem'
import type { Post } from '@/interfaces/post'
import { motion } from 'framer-motion'

type PostListProps = {
  readonly posts?: Post[] | null
  readonly isLoading?: boolean
  readonly isError?: boolean
  readonly emptyMessage?: string
  readonly defaultShowComments?: boolean
  readonly useInfiniteScroll?: boolean
}

const DEFAULT_LIMIT = 10

const postVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export default function PostList({
  posts,
  isLoading,
  isError,
  emptyMessage = 'Aucun post pour le moment.',
  defaultShowComments,
  useInfiniteScroll = true,
}: PostListProps) {
  const shouldUseQuery = typeof posts === 'undefined'
  const shouldUseInfinite = shouldUseQuery && useInfiniteScroll !== false

  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    error: infiniteError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({ limit: DEFAULT_LIMIT, enabled: shouldUseInfinite })

  const { posts: queriedPosts, isLoading: queryLoading, error: queryError } = usePosts(
    shouldUseQuery && !shouldUseInfinite
  )

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!shouldUseInfinite) return
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [shouldUseInfinite, fetchNextPage, hasNextPage, isFetchingNextPage])

  const infinitePosts = useMemo(() => {
    const pages: readonly PaginatedPostsResponse[] =
      (infiniteData as InfiniteData<PaginatedPostsResponse> | undefined)?.pages ?? []
    return pages.flatMap((page: PaginatedPostsResponse) => page.items)
  }, [infiniteData])

  const loading =
    typeof isLoading !== 'undefined'
      ? isLoading
      : shouldUseInfinite
        ? infiniteLoading
        : queryLoading

  const errorState =
    typeof isError !== 'undefined'
      ? isError
      : shouldUseInfinite
        ? Boolean(infiniteError)
        : Boolean(queryError)

  const sourcePosts: Post[] | null = shouldUseQuery
    ? shouldUseInfinite
      ? infinitePosts
      : queriedPosts ?? null
    : posts ?? null

  const orderedPosts = useMemo<Post[] | null>(() => {
    if (!sourcePosts || sourcePosts.length === 0) {
      return sourcePosts
    }
    if (shouldUseInfinite) {
      return sourcePosts
    }
    return sourcePosts
      .slice()
      .sort(
        (a: Post, b: Post) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }, [sourcePosts, shouldUseInfinite])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl shadow p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (errorState) {
    return <p className="text-red-500">Erreur lors du chargement des posts.</p>
  }

  if (!orderedPosts || orderedPosts.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="space-y-4">
      {orderedPosts.map((post: Post, index: number) => (
        <motion.div
          key={post.id}
          custom={index}
          variants={postVariants}
          initial="hidden"
          animate="visible"
          viewport={{ once: true }}
        >
          <PostItem post={post} defaultShowComments={defaultShowComments} />
        </motion.div>
      ))}

      {shouldUseInfinite && hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-4"
          aria-live="polite"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
              Chargement...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
