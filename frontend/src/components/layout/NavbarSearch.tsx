'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2, User, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNavbarSearch } from '@/hooks/useNavbarSearch'
import { cn } from '@/lib/utils'

type NavbarSearchProps = {
  limit?: number
  className?: string
}

type SearchItem =
  | { type: 'user'; id: number; label: string; href: string }
  | { type: 'group'; id: number; label: string; href: string }

export default function NavbarSearch({ limit = 5, className }: NavbarSearchProps) {
  const [query, setQuery] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeout = useRef<number>()
  const listboxId = useId()
  const router = useRouter()

  const { users, groups, isLoading, isFetching, error, debouncedQuery } = useNavbarSearch({
    query,
    limit,
  })

  const userResults = users ?? []
  const groupResults = groups ?? []

  const items = useMemo<SearchItem[]>(() => {
    const userItems = userResults.map((user) => ({
      type: 'user' as const,
      id: user.id,
      label: user.username,
      href: `/user/${user.id}`,
    }))
    const groupItems = groupResults.map((group) => ({
      type: 'group' as const,
      id: group.id,
      label: group.name,
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
      if (activeIndex >= 0 && activeIndex < items.length) {
        event.preventDefault()
        handleSelect(items[activeIndex])
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
    isExpanded ? 'w-full sm:w-64 lg:w-[22rem]' : 'w-full sm:w-36 lg:w-48',
    className
  )

  const renderSection = (
    title: string,
    entries: SearchItem[],
    offset: number,
    icon: React.ReactNode
  ) => {
    if (entries.length === 0) return null

    return (
      <div className="py-2">
        <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
        <ul role="presentation" className="mt-1 space-y-1">
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
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-inherit no-underline"
                  onClick={(event) => {
                    event.preventDefault()
                    handleSelect(item)
                  }}
                >
                  {icon}
                  <span>{item.label}</span>
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
            placeholder="Rechercher un utilisateur ou un groupe…"
            className="h-10 pl-9 pr-8"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,90vw)] p-0"
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
          {renderSection(
            'Utilisateurs',
            userItems,
            0,
            <User className="h-4 w-4" aria-hidden />
          )}
          {renderSection(
            'Groupes',
            groupItems,
            userItems.length,
            <Hash className="h-4 w-4" aria-hidden />
          )}

          {!hasResults && !isLoading && !isFetching ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Aucun résultat</p>
          ) : null}

          {error ? (
            <p className="px-3 py-2 text-sm text-destructive">Erreur de recherche</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
