import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PageResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, loading, emptyMessage }: DataTableProps<T>) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-start">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 text-start font-medium text-ink-soft', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-soft">
                {t('common.loading')}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-soft">
                {emptyMessage ?? t('common.empty')}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-paper')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

interface PaginationProps {
  page: PageResponse<unknown> | undefined
  onPageChange: (page: number) => void
}

export function Pagination({ page, onPageChange }: PaginationProps) {
  const { t } = useTranslation()
  if (!page || page.totalPages <= 1) return null
  const isRtl = document.documentElement.dir === 'rtl'
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-ink-soft">
      <span>{t('common.pageOf', { page: page.page + 1, total: page.totalPages })}</span>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Previous page"
          disabled={page.page === 0}
          onClick={() => onPageChange(page.page - 1)}
        >
          <Prev className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Next page"
          disabled={page.page >= page.totalPages - 1}
          onClick={() => onPageChange(page.page + 1)}
        >
          <Next className="size-4" />
        </Button>
      </div>
    </div>
  )
}
