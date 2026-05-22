'use client'

import { Suspense } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { search } from '@/services/searchService'
import type { SearchResponse } from '@/interfaces/search'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Users, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Échappe le HTML brut puis ré-autorise uniquement <mark>...</mark>
 * pour le highlighting Elasticsearch.
 */
function sanitizeSnippet(snippet: string): string {
    const escaped = snippet
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    return escaped
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>')
}

const SEARCH_LIMIT = 20

function UserAvatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl: string | null; size?: number }) {
    const initials = name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <Avatar className="shrink-0" style={{ width: size, height: size }}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
            </AvatarFallback>
        </Avatar>
    )
}

function SearchContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialQuery = searchParams.get('q') ?? ''
    const [inputValue, setInputValue] = useState(initialQuery)

    useEffect(() => {
        setInputValue(searchParams.get('q') ?? '')
    }, [searchParams])

    const query = searchParams.get('q')?.trim() ?? ''

    const { data, isLoading, error } = useQuery<SearchResponse, Error>({
        queryKey: ['search', query, SEARCH_LIMIT],
        queryFn: () => search({ q: query, limit: SEARCH_LIMIT }),
        enabled: query.length >= 1,
        staleTime: 30_000,
    })

    const users = useMemo(() => data?.users ?? [], [data])
    const groups = useMemo(() => data?.groups ?? [], [data])
    const posts = useMemo(() => data?.posts ?? [], [data])
    const totalResults = users.length + groups.length + posts.length

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const q = inputValue.trim()
        if (!q) return
        router.push(`/search?q=${encodeURIComponent(q)}`)
    }

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold font-mono">
                <span className="text-primary">&lt;</span>Recherche<span className="text-primary">/&gt;</span>
            </h1>

            <form onSubmit={handleSubmit} className="relative sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Rechercher utilisateur, groupe ou publication"
                    className="pl-9 h-11"
                    autoFocus
                />
            </form>

            {query && !isLoading && !error && (
                <p className="text-sm text-muted-foreground">
                    {totalResults} resultat{totalResults !== 1 ? 's' : ''} pour &laquo; {query} &raquo;
                </p>
            )}

            {isLoading && (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-sm text-destructive">Erreur lors de la recherche.</p>
            )}

            {!isLoading && !error && query && (
                <div className="space-y-8">
                    {users.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                                Utilisateurs ({users.length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {users.map((user, index) => {
                                    const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ')
                                    const displayName = fullName || user.username

                                    return (
                                        <motion.div
                                            key={user.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(index * 0.04, 0.8), duration: 0.3 }}
                                            whileHover={{ y: -3 }}
                                        >
                                            <Link href={`/user/${user.id}`} className="block h-full">
                                                <Card className="h-full border border-border/50 bg-card transition-all hover:border-border hover:shadow-md cursor-pointer p-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar name={displayName} avatarUrl={user.avatarUrl} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-sm truncate">{displayName}</p>
                                                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {groups.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                                Groupes ({groups.length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {groups.map((group, index) => (
                                    <motion.div
                                        key={group.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(index * 0.04, 0.8), duration: 0.3 }}
                                        whileHover={{ y: -3 }}
                                    >
                                        <Link href={`/group/${group.id}`} className="block h-full">
                                            <Card className="h-full border border-border/50 bg-card transition-all hover:border-border hover:shadow-md cursor-pointer p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-full bg-muted flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
                                                        <Users className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-sm truncate">{group.name}</p>
                                                        <p className="text-xs text-muted-foreground">Groupe</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {posts.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                                Publications ({posts.length})
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {posts.map((post, index) => {
                                    const date = post.createdAt ? new Date(post.createdAt) : null
                                    const formattedDate = date && !Number.isNaN(date.getTime())
                                        ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : null
                                    return (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(index * 0.04, 0.8), duration: 0.3 }}
                                            whileHover={{ y: -3 }}
                                        >
                                            <Link href={`/post/${post.id}`} className="block h-full">
                                                <Card className="h-full border border-border/50 bg-card transition-all hover:border-border hover:shadow-md cursor-pointer p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="rounded-full bg-muted flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
                                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                {post.authorUsername && (
                                                                    <span className="font-medium text-foreground/80">@{post.authorUsername}</span>
                                                                )}
                                                                {post.groupName && (
                                                                    <>
                                                                        <span aria-hidden>•</span>
                                                                        <span className="truncate">{post.groupName}</span>
                                                                    </>
                                                                )}
                                                                {formattedDate && (
                                                                    <>
                                                                        <span aria-hidden>•</span>
                                                                        <span>{formattedDate}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <p
                                                                className="text-sm text-foreground/90 line-clamp-3 [&>mark]:bg-primary/20 [&>mark]:text-foreground [&>mark]:rounded-sm [&>mark]:px-0.5"
                                                                dangerouslySetInnerHTML={{ __html: sanitizeSnippet(post.snippet) }}
                                                            />
                                                        </div>
                                                    </div>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {totalResults === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-12">
                            Aucun resultat pour &laquo; {query} &raquo;
                        </p>
                    )}
                </div>
            )}

            {!query && (
                <p className="text-center text-sm text-muted-foreground py-12">
                    Tapez un terme pour rechercher des utilisateurs, des groupes ou des publications.
                </p>
            )}
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="max-w-5xl mx-auto p-4">Chargement...</div>}>
            <SearchContent />
        </Suspense>
    )
}
