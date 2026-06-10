'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface Column<T = any> {
  key: string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string | number
  className?: string
}

interface TableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
  striped?: boolean
  hoverable?: boolean
  bordered?: boolean
  compact?: boolean
  className?: string
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  className = ''
}: TableProps<T>) => {
  const [internalSortColumn, setInternalSortColumn] = useState<string>()
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: Column) => {
    if (!column.sortable) return

    const newDirection = 
      (onSort ? sortColumn : internalSortColumn) === column.key && 
      (onSort ? sortDirection : internalSortDirection) === 'asc' 
        ? 'desc' 
        : 'asc'

    if (onSort) {
      onSort(column.key, newDirection)
    } else {
      setInternalSortColumn(column.key)
      setInternalSortDirection(newDirection)
    }
  }

  const getSortIcon = (column: Column) => {
    if (!column.sortable) return null

    const active = (onSort ? sortColumn : internalSortColumn) === column.key
    
    if (!active) {
      return <ChevronsUpDown className="w-4 h-4 text-neutral-400" />
    }

    return (onSort ? sortDirection : internalSortDirection) === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-primary-600" />
      : <ChevronDown className="w-4 h-4 text-primary-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={cn(
        'w-full text-sm',
        bordered && 'border border-neutral-200',
        compact ? 'border-collapse' : 'border-separate border-spacing-0'
      )}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column)}
                className={cn(
                  'bg-neutral-50 font-medium text-neutral-700',
                  bordered && 'border border-neutral-200',
                  compact ? 'px-3 py-2' : 'px-6 py-4',
                  column.sortable && 'cursor-pointer hover:bg-neutral-100',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.className
                )}
                style={{ width: column.width }}
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn(
                  'text-center text-neutral-500 py-12',
                  bordered && 'border border-neutral-200'
                )}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  striped && rowIndex % 2 === 1 && 'bg-neutral-50',
                  hoverable && 'hover:bg-neutral-100 cursor-pointer transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      bordered && 'border border-neutral-200',
                      compact ? 'px-3 py-2' : 'px-6 py-4',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {column.accessor 
                      ? column.accessor(row)
                      : row[column.key]
                    }
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