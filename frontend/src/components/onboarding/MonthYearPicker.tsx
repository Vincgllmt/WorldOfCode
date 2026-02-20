'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
]

const MONTH_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

type MonthYearPickerProps = {
  value: string | null | undefined
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Sélectionner une date',
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear()
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const parsed = parseInt(value.split('-')[0])
      return isNaN(parsed) ? currentYear : parsed
    }
    return currentYear
  })
  const [open, setOpen] = useState(false)

  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : -1
  const selectedYear = value ? parseInt(value.split('-')[0]) : -1

  const handleSelect = (monthIndex: number) => {
    const formatted = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
    onChange(formatted)
    setOpen(false)
  }

  const displayValue = value
    ? `${MONTH_FULL[parseInt(value.split('-')[1]) - 1]} ${value.split('-')[0]}`
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal mt-1',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={viewYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const isSelected = selectedYear === viewYear && selectedMonth === index
            const isFuture =
              viewYear > currentYear ||
              (viewYear === currentYear && index > new Date().getMonth())

            return (
              <Button
                key={month}
                type="button"
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                disabled={isFuture}
                onClick={() => handleSelect(index)}
                className={cn(
                  'text-xs',
                  isSelected && 'bg-green-600 hover:bg-green-700 text-white'
                )}
              >
                {month}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
