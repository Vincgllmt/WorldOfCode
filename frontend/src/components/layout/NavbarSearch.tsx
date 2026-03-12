'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavbarSearch } from '@/hooks/useNavbarSearch'
import { cn } from '@/lib/utils'

type NavbarSearchProps = {
  limit?: number
  className?: string
}

type SearchItem =
  | { type: 'user'; id: number; label: string; sub: string; avatarUrl: string | null; href: string }
  | { type: 'group'; id: number; label: string; sub: string; href: string }

function UserAvatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar className="shrink-0" style={{ width: size, height: size }}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default function NavbarSearch({ limit = 5, className }: NavbarSearchProps) {
  const [query, setQuery] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeout = useRef<number>(0)
  const listboxId = useId()
  const router = useRouter()

  const { users, groups, isLoading, isFetching, error, debouncedQuery } = useNavbarSearch({
    query,
    limit,
  })

  const userResults = users ?? []
  const groupResults = groups ?? []

  const items = useMemo<SearchItem[]>(() => {
    const userItems: SearchItem[] = userResults.map((user) => {
      const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ')
      return {
        type: 'user',
        id: user.id,
        label: fullName || user.username,
        sub: `@${user.username}`,
        avatarUrl: user.avatarUrl ?? null,
        href: `/user/${user.id}`,
      }
    })
    const groupItems: SearchItem[] = groupResults.map((group) => ({
      type: 'group',
      id: group.id,
      label: group.name,
      sub: 'Groupe',
      href: `/group/${group.id}`,
    }))
    return [...userItems, ...groupItems]
  }, [userResults, groupResults])

  const hasResults = items.length > 0

  const userItems = useMemo(
    () => items.filter((item) => item.type === 'user'),
    [items]
  )
  const groupItems = useMemo(
    () => items.filter((item) => item.type === 'group'),
    [items]
  )

  const shouldDisplayPopover = open && debouncedQuery.length > 0

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setOpen(false)
      setActiveIndex(-1)
    } else {
      setOpen(true)
    }
  }, [debouncedQuery])

  useEffect(() => {
    setActiveIndex((index) => {
      if (items.length === 0) return -1
      if (index >= items.length) return items.length - 1
      return index
    })
  }, [items.length])

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        window.clearTimeout(blurTimeout.current)
      }
    }
  }, [])

  const handleSelect = (item: SearchItem) => {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current)
    }
    router.push(item.href)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
    setIsExpanded(false)
    inputRef.current?.blur()
  }

  const goToSearchPage = () => {
    const q = query.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
    setIsExpanded(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => {
        const nextIndex = prev + 1
        if (nextIndex >= items.length) return items.length - 1
        return nextIndex
      })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => {
        const nextIndex = prev - 1
        if (nextIndex < 0) return -1
        return nextIndex
      })
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && activeIndex < items.length) {
        handleSelect(items[activeIndex])
      } else {
        goToSearchPage()
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      if (!query) {
        setIsExpanded(false)
      }
      return
    }
  }

  const highlightedItemId =
    activeIndex >= 0 && activeIndex < items.length ? `${listboxId}-item-${activeIndex}` : undefined

  const containerClasses = cn(
    'relative transition-all duration-200 ease-out basis-full sm:basis-auto',
    isExpanded ? 'w-full sm:w-72 lg:w-96' : 'w-full sm:w-56 lg:w-72',
    className
  )

  const renderSection = (
    title: string,
    entries: SearchItem[],
    offset: number,
  ) => {
    if (entries.length === 0) return null

    return (
      <div className="py-2">
        <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
        <ul role="presentation" className="mt-1 space-y-0.5">
          {entries.map((item, index) => {
            const flatIndex = offset + index
            const isActive = flatIndex === activeIndex
            const itemId = `${listboxId}-item-${flatIndex}`
            return (
              <li
                key={`${item.type}-${item.id}`}
                id={itemId}
                role="option"
                aria-selected={isActive}
                className={cn(
                  'rounded-md text-sm transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                )}
                onMouseEnter={() => setActiveIndex(flatIndex)}
                onMouseDown={(event) => event.preventDefault()}
              >
                <Link
                  href={item.href}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-inherit no-underline"
                  onClick={(event) => {
                    event.preventDefault()
                    handleSelect(item)
                  }}
                >
                  {item.type === 'user' ? (
                    <UserAvatar name={item.label} avatarUrl={item.avatarUrl} />
                  ) : (
                    <div className="rounded-full bg-muted flex items-center justify-center shrink-0" style={{ width: 28, height: 28 }}>
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm leading-tight">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <Popover open={shouldDisplayPopover} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={containerClasses}>
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" aria-hidden />
          </div>
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              const value = event.target.value
              setQuery(value)
              setActiveIndex(-1)
              setOpen(value.trim().length > 0)
              if (value.trim().length > 0) {
                setIsExpanded(true)
              }
            }}
            onFocus={() => {
              if (blurTimeout.current) {
                window.clearTimeout(blurTimeout.current)
              }
              setIsExpanded(true)
              if (debouncedQuery.length > 0) setOpen(true)
            }}
            onBlur={() => {
              blurTimeout.current = window.setTimeout(() => {
                setIsExpanded(false)
              }, 120)
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={shouldDisplayPopover}
            aria-controls={shouldDisplayPopover ? listboxId : undefined}
            aria-activedescendant={highlightedItemId}
            aria-autocomplete="list"
            placeholder="Rechercher un utilisateur ou un groupe..."
            className="h-10 pl-9 pr-8"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(24rem,90vw)] p-0"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        aria-live="polite"
      >
        <div
          id={listboxId}
          role="listbox"
          aria-label="Suggestions de recherche"
          className="max-h-80 overflow-y-auto"
        >
          {renderSection('Utilisateurs', userItems, 0)}
          {renderSection('Groupes', groupItems, userItems.length)}

          {!hasResults && !isLoading && !isFetching ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Aucun résultat</p>
          ) : null}

          {error ? (
            <p className="px-3 py-2 text-sm text-destructive">Erreur de recherche</p>
          ) : null}

          {hasResults && (
            <button
              type="button"
              className="w-full border-t border-border px-3 py-2.5 text-xs font-medium text-primary hover:bg-muted transition-colors text-center"
              onMouseDown={(event) => event.preventDefault()}
              onClick={goToSearchPage}
            >
              Voir tous les résultats
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
