import { Search } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

type CommandContextValue = {
  search: string
  setSearch: (value: string) => void
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommandContext(component: string): CommandContextValue {
  const context = React.useContext(CommandContext)
  if (!context) {
    throw new Error(`${component} must be used within <Command>`)
  }
  return context
}

type CommandProps = React.HTMLAttributes<HTMLDivElement> & {
  search?: string
  onSearchChange?: (value: string) => void
}

function Command({ className, children, search, onSearchChange, ...props }: CommandProps) {
  const [internalSearch, setInternalSearch] = React.useState('')

  const searchValue = search ?? internalSearch
  const setSearchValue = onSearchChange ?? setInternalSearch

  return (
    <CommandContext.Provider value={{ search: searchValue, setSearch: setSearchValue }}>
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

type CommandInputProps = React.InputHTMLAttributes<HTMLInputElement>

function CommandInput({ className, ...props }: CommandInputProps) {
  const { search, setSearch } = useCommandContext('CommandInput')

  return (
    <div className="flex items-center border-b px-3" data-slot="command-input-wrapper">
      <Search className="mr-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground',
          className
        )}
        {...props}
      />
    </div>
  )
}

type CommandListProps = React.HTMLAttributes<HTMLDivElement>

function CommandList({ className, ...props }: CommandListProps) {
  return (
    <div
      className={cn('max-h-60 overflow-y-auto overflow-x-hidden', className)}
      role="listbox"
      {...props}
    />
  )
}

type CommandGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  heading?: string
}

function CommandGroup({ className, heading, children, ...props }: CommandGroupProps) {
  return (
    <div
      className={cn(
        'overflow-hidden p-1 text-sm [&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:py-1.5 [&_[data-command-group-heading]]:font-semibold [&_[data-command-group-heading]]:text-muted-foreground',
        className
      )}
      role="group"
      {...props}
    >
      {heading && (
        <div data-command-group-heading="">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

type CommandItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
  keywords?: string[]
  onSelect?: (value: string) => void
}

function CommandItem({
  value,
  keywords,
  onSelect,
  className,
  children,
  ...props
}: CommandItemProps) {
  const { search } = useCommandContext('CommandItem')

  const normalizedSearch = search.trim().toLowerCase()
  const matchCandidates = [value, ...(keywords ?? [])].map((candidate) =>
    candidate.toLowerCase()
  )
  const isVisible =
    normalizedSearch.length === 0 ||
    matchCandidates.some((candidate) => candidate.includes(normalizedSearch))

  if (!isVisible) {
    return null
  }

  return (
    <button
      type="button"
      role="option"
      onClick={() => onSelect?.(value)}
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none transition hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type CommandEmptyProps = React.HTMLAttributes<HTMLDivElement>

function CommandEmpty({ className, ...props }: CommandEmptyProps) {
  return (
    <div className={cn('py-6 text-center text-sm text-muted-foreground', className)} {...props} />
  )
}

type CommandSeparatorProps = React.HTMLAttributes<HTMLDivElement>

function CommandSeparator({ className, ...props }: CommandSeparatorProps) {
  return <div className={cn('-mx-1 h-px bg-border', className)} {...props} />
}

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
    {...props}
  />
)
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
  CommandShortcut,
}
