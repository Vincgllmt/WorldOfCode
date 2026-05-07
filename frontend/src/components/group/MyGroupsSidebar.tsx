'use client'

import { useState, useMemo } from 'react'
import { Users, Search, MessageSquareHeart, GraduationCap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { getMyMentorProfile } from '@/lib/api/mentoring/profile'
import Link from 'next/link'

export default function MyGroupsSidebar() {
    const { user } = useAuth()
    const { data: myGroups, isLoading } = useUserGroups(user?.id)
    const [search, setSearch] = useState('')

    const { data: mentorProfile } = useQuery({
        queryKey: ['mentorProfile', 'me'],
        queryFn: getMyMentorProfile,
        retry: false,
        enabled: !!user,
        // 404 = pas encore mentor, on supprime l'erreur
        throwOnError: false,
    })

    const filteredGroups = useMemo(() => {
        if (!myGroups) return []
        if (!search.trim()) return myGroups
        const term = search.toLowerCase()
        return myGroups.filter((g) =>
            g.name.toLowerCase().startsWith(term)
        )
    }, [myGroups, search])

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    Mes groupes
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        )
    }

    return (
    <>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Users className="h-4 w-4 text-primary" />
                Mes groupes
                {myGroups && myGroups.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">({myGroups.length})</span>
                )}
            </div>

            {myGroups && myGroups.length > 3 && (
                <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                </div>
            )}

            {!myGroups || myGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Vous n&apos;avez rejoint aucun groupe.
                </p>
            ) : filteredGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Aucun groupe trouvé.
                </p>
            ) : (
                <nav className="space-y-0.5">
                    {filteredGroups.slice(0, 8).map((group) => (
                        <Link
                            key={group.id}
                            href={`/group/${group.id}`}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                                {group.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate">{group.name}</span>
                        </Link>
                    ))}
                </nav>
            )}

            <Link
                href="/group"
                className="block text-xs text-primary hover:underline pt-3 text-center"
            >
                Voir tous les groupes
            </Link>
        </div>

        {!mentorProfile && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Devenez mentor
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    Partagez vos connaissances et aidez d&apos;autres développeurs à progresser.
                </p>
                <Link
                    href="/mentor/onboarding"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Créer mon profil mentor
                </Link>
            </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-4 mt-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <MessageSquareHeart className="h-4 w-4 text-primary" />
                Votre avis
            </div>
            <p className="text-xs text-muted-foreground mb-3">
                Aidez-nous à améliorer WOC en partageant votre expérience !
            </p>
            <Link
                href="/feedback"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                Donner mon avis
            </Link>
        </div>
    </>
    )
}
