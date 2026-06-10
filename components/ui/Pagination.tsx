'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  showFirstLast?: boolean
  showPrevNext?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  size = 'md',
  className = ''
}: PaginationProps) => {
  const range = (start: number, end: number) => {
    const length = end - start + 1
    return Array.from({ length }, (_, i) => start + i)
  }

  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3
    const totalBlocks = totalNumbers + 2

    if (totalPages <= totalBlocks) {
      return range(1, totalPages)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2

    const firstPageIndex = 1
    const lastPageIndex = totalPages

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = range(1, leftItemCount)
      return [...leftRange, 'dots', totalPages]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = range(totalPages - rightItemCount + 1, totalPages)
      return [1, 'dots', ...rightRange]
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex)
      return [1, 'dots', ...middleRange, 'dots', totalPages]
    }

    return []
  }

  const pageNumbers = getPageNumbers()

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  }

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)}>
      {/* First page button */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={sizeClasses[size]}
        >
          <span className="sr-only">First page</span>
          <span>«</span>
        </Button>
      )}

      {/* Previous button */}
      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={sizeClasses[size]}
        >
          <span className="sr-only">Previous page</span>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'dots') {
          return (
            <span
              key={`dots-${index}`}
              className={cn(
                'flex items-center justify-center',
                sizeClasses[size]
              )}
            >
              <MoreHorizontal className="w-4 h-4 text-neutral-400" />
            </span>
          )
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? 'primary' : 'ghost'}
            size={size}
            onClick={() => onPageChange(page as number)}
            className={sizeClasses[size]}
          >
            {page}
          </Button>
        )
      })}

      {/* Next button */}
      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={sizeClasses[size]}
        >
          <span className="sr-only">Next page</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Last page button */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={sizeClasses[size]}
        >
          <span className="sr-only">Last page</span>
          <span>»</span>
        </Button>
      )}
    </nav>
  )
}