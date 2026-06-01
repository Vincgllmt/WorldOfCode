'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { InfiniteData } from '@tanstack/react-query'
import type { PaginatedPostsResponse } from '@/interfaces/postPagination'
import { useInfinitePosts } from '@/hooks/useInfinitePosts'
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed'
import type { FeedResponse, FeedItem } from '@/services/feedService'
import { usePosts } from '@/hooks/usePosts'
import PostItem from './PostItem'
import TechWatchCard from '@/components/techwatch/TechWatchCard'
import type { Post } from '@/interfaces/post'
import { motion } from 'framer-motion'

type MixedFeedEntry =
  | { type: 'post'; post: Post }
  | { type: 'rss'; rssItem: NonNullable<FeedItem['rssItem']> }

type PostListProps = {
  readonly posts?: Post[] | null
  readonly isLoading?: boolean
  readonly isError?: boolean
  readonly emptyMessage?: string
  readonly defaultShowComments?: boolean
  readonly useInfiniteScroll?: boolean
  readonly mode?: 'chronological' | 'feed'
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
  mode = 'chronological',
}: PostListProps) {
  const shouldUseQuery = typeof posts === 'undefined'
  const shouldUseInfinite = shouldUseQuery && useInfiniteScroll !== false
  const shouldUseFeed = shouldUseInfinite && mode === 'feed'

  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    error: infiniteError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({ limit: DEFAULT_LIMIT, enabled: shouldUseInfinite && !shouldUseFeed })

  const {
    data: feedData,
    isLoading: feedLoading,
    error: feedError,
    fetchNextPage: fetchNextFeedPage,
    hasNextPage: hasNextFeedPage,
    isFetchingNextPage: isFetchingNextFeedPage,
  } = useInfiniteFeed({ limit: DEFAULT_LIMIT, enabled: shouldUseFeed })

  const { posts: queriedPosts, isLoading: queryLoading, error: queryError } = usePosts(
    shouldUseQuery && !shouldUseInfinite
  )

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const activeFetchNextPage = shouldUseFeed ? fetchNextFeedPage : fetchNextPage
  const activeHasNextPage = shouldUseFeed ? hasNextFeedPage : hasNextPage
  const activeIsFetchingNextPage = shouldUseFeed ? isFetchingNextFeedPage : isFetchingNextPage

  useEffect(() => {
    if (!shouldUseInfinite) return
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && activeHasNextPage && !activeIsFetchingNextPage) {
          void activeFetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [shouldUseInfinite, activeFetchNextPage, activeHasNextPage, activeIsFetchingNextPage])

  const feedEntries = useMemo<MixedFeedEntry[]>(() => {
    if (!shouldUseFeed) return []
    const pages: readonly FeedResponse[] =
      (feedData as InfiniteData<FeedResponse> | undefined)?.pages ?? []
    return pages
      .flatMap((page) => page.items)
      .map<MixedFeedEntry | null>((item) => {
        if (item.type === 'post' && item.post) return { type: 'post', post: item.post }
        if (item.type === 'rss_item' && item.rssItem) return { type: 'rss', rssItem: item.rssItem }
        return null
      })
      .filter((e): e is MixedFeedEntry => e !== null)
  }, [feedData, shouldUseFeed])

  const infinitePosts = useMemo(() => {
    if (shouldUseFeed) {
      return feedEntries.filter((e): e is { type: 'post'; post: Post } => e.type === 'post').map((e) => e.post)
    }
    const pages: readonly PaginatedPostsResponse[] =
      (infiniteData as InfiniteData<PaginatedPostsResponse> | undefined)?.pages ?? []
    return pages.flatMap((page: PaginatedPostsResponse) => page.items)
  }, [infiniteData, feedEntries, shouldUseFeed])

  const loading =
    typeof isLoading !== 'undefined'
      ? isLoading
      : shouldUseInfinite
        ? (shouldUseFeed ? feedLoading : infiniteLoading)
        : queryLoading

  const errorState =
    typeof isError !== 'undefined'
      ? isError
      : shouldUseInfinite
        ? Boolean(shouldUseFeed ? feedError : infiniteError)
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

  const hasFeedEntries = shouldUseFeed && feedEntries.length > 0
  const isEmpty = shouldUseFeed
    ? !hasFeedEntries
    : !orderedPosts || orderedPosts.length === 0

  if (isEmpty) {
    return <p className="text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="space-y-4">
      {shouldUseFeed
        ? feedEntries.map((entry, index) => (
            <motion.div
              key={entry.type === 'post' ? `post-${entry.post.id}` : `rss-${entry.rssItem.id}`}
              custom={index}
              variants={postVariants}
              initial="hidden"
              animate="visible"
              viewport={{ once: true }}
            >
              {entry.type === 'post' ? (
                <PostItem post={entry.post} defaultShowComments={defaultShowComments} />
              ) : (
                <TechWatchCard item={entry.rssItem} />
              )}
            </motion.div>
          ))
        : (orderedPosts ?? []).map((post: Post, index: number) => (
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

      {shouldUseInfinite && activeHasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-4"
          aria-live="polite"
        >
          {activeIsFetchingNextPage && (
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
