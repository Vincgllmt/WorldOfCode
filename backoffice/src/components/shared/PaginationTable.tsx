'use client'

import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReactNode, useState } from 'react'
import React from 'react'

type PaginatedTableProps<T> = {
  data: T[]
  headers: ReactNode
  renderRow: (item: T, index: number) => ReactNode
  itemsPerPage?: number
  emptyState?: ReactNode
  // Mode server-side (optionnel) — si fourni, la pagination est externe
  totalItems?: number
  currentPage?: number
  onPageChange?: (page: number) => void
}

export function PaginatedTable<T>({
  data,
  headers,
  renderRow,
  itemsPerPage = 10,
  emptyState,
  totalItems,
  currentPage: externalPage,
  onPageChange,
}: PaginatedTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1)

  const isServerSide = totalItems !== undefined && externalPage !== undefined && onPageChange !== undefined

  const total        = isServerSide ? totalItems : data.length
  const totalPages   = Math.max(1, Math.ceil(total / itemsPerPage))
  const safeCurrentPage = isServerSide
    ? Math.min(externalPage, totalPages)
    : Math.min(internalPage, totalPages)

  const paginated = isServerSide
    ? data
    : data.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)

  const from = total === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
  const to   = isServerSide
    ? Math.min(safeCurrentPage * itemsPerPage, total)
    : Math.min(safeCurrentPage * itemsPerPage, data.length)

  const goTo = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages))
    if (isServerSide) onPageChange(clamped)
    else setInternalPage(clamped)
  }

  // Compute visible page numbers (max 5 around current)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    pages.push(1)
    if (safeCurrentPage > 3) pages.push('ellipsis')
    for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
      pages.push(i)
    }
    if (safeCurrentPage < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-border">
              {headers}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <td colSpan={99} className="py-12 text-center text-sm text-muted-foreground">
                  {emptyState ?? 'Aucun résultat'}
                </td>
              </TableRow>
            ) : (
              paginated.map((item, i) => (
                <React.Fragment key={i}>
                  {renderRow(item, (safeCurrentPage - 1) * itemsPerPage + i)}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(totalPages > 1 || data.length > 0) && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {data.length === 0
              ? 'Aucun résultat'
              : `${from}–${to} sur ${data.length}`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => goTo(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {getPageNumbers().map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safeCurrentPage ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => goTo(p)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => goTo(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
