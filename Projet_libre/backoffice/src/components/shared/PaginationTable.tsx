
'use client'

import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { ReactNode, useState } from 'react'
import React from 'react'

type PaginatedTableProps<T> = {
  data: T[]
  headers: ReactNode
  renderRow: (item: T) => ReactNode
  itemsPerPage?: number
}

export function PaginatedTable<T>({
  data,
  headers,
  renderRow,
  itemsPerPage = 5,
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const paginated = data.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>{headers}</TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((item, i) => (
            <React.Fragment key={i}>{renderRow(item)}</React.Fragment>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <PaginationItem key={p}>
                <Button
                  variant={p === page ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
