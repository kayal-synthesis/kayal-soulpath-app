import { format, formatDistance, formatRelative, differenceInDays } from 'date-fns'

/**
 * Format date to string
 */
export const formatDate = (
  date: string | Date,
  formatStr: string = 'PPP'
): string => {
  return format(new Date(date), formatStr)
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

/**
 * Format date to short format (e.g., "Mar 17, 1992")
 */
export const formatShortDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM d, yyyy')
}

/**
 * Format date to time (e.g., "2:30 PM")
 */
export const formatTime = (date: string | Date): string => {
  return format(new Date(date), 'h:mm a')
}

/**
 * Format number with commas (e.g., "1,234,567")
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

/**
 * Format currency (e.g., "$1,234.56")
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Format percentage (e.g., "45.5%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format phone number (e.g., "(555) 123-4567")
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3]
  }
  
  return phone
}

/**
 * Format name (capitalize each word)
 */
export const formatName = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Format list as natural language (e.g., "item1, item2 and item3")
 */
export const formatList = (items: string[]): string => {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  
  const last = items.pop()
  return `${items.join(', ')}, and ${last}`
}

/**
 * Format duration in minutes to readable string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`
}

/**
 * Format number with ordinal suffix (e.g., "1st", "2nd", "3rd", "4th")
 */
export const formatOrdinal = (num: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}