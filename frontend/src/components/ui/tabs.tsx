import * as React from 'react'

import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext(component: string): TabsContextValue {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error(`${component} must be used within <Tabs>`)
  }
  return context
}

type TabsProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

type TabsTriggerProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  value: string
}

function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext('TabsTrigger')
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-panel-${value}`}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex min-w-[120px] items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive && 'bg-background text-foreground shadow',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabsContext('TabsContent')
  const isHidden = activeValue !== value

  return (
    <div
      role="tabpanel"
      id={`tab-panel-${value}`}
      aria-hidden={isHidden}
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isHidden && 'hidden',
        className
      )}
      {...props}
    >
      {!isHidden && children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
