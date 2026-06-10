import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 * 
 * @example
 * cn('px-4 py-2', 'bg-blue-500', condition && 'text-white')
 * // => 'px-4 py-2 bg-blue-500 text-white'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Conditional class name builder with TypeScript support
 * 
 * @example
 * const buttonClass = cns(
 *   'btn',
 *   variant === 'primary' && 'btn-primary',
 *   size === 'lg' && 'btn-lg'
 * )
 */
export function cns(...conditions: (string | boolean | undefined | null)[]): string {
  return conditions.filter(Boolean).join(' ')
}

/**
 * Format number with K/M/B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toString()
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}