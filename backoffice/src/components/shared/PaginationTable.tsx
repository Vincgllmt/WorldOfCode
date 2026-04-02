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
}

export function PaginatedTable<T>({
  data,
  headers,
  renderRow,
  itemsPerPage = 10,
  emptyState,
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage))
  const safeCurrentPage = Math.min(page, totalPages)
  const paginated = data.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)

  const from = data.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
  const to = Math.min(safeCurrentPage * itemsPerPage, data.length)

  const goTo = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))

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
