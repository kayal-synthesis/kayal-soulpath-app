/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Password validation
 * Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number
 */
export const validatePassword = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Phone number validation
 */
export const validatePhone = (phone: string): boolean => {
  const re = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
  return re.test(phone)
}

/**
 * URL validation
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Date validation
 */
export const validateDate = (date: string): boolean => {
  const d = new Date(date)
  return d instanceof Date && !isNaN(d.getTime())
}

/**
 * Birth date validation (must be in the past and reasonable age)
 */
export const validateBirthDate = (date: string): {
  isValid: boolean
  error?: string
} => {
  const birthDate = new Date(date)
  const today = new Date()
  
  if (!validateDate(date)) {
    return { isValid: false, error: 'Invalid date format' }
  }
  
  if (birthDate > today) {
    return { isValid: false, error: 'Birth date cannot be in the future' }
  }
  
  const age = today.getFullYear() - birthDate.getFullYear()
  if (age > 120) {
    return { isValid: false, error: 'Age cannot be greater than 120 years' }
  }
  
  if (age < 13) {
    return { isValid: false, error: 'You must be at least 13 years old' }
  }
  
  return { isValid: true }
}

/**
 * Name validation
 */
export const validateName = (name: string): {
  isValid: boolean
  error?: string
} => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' }
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' }
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' }
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const re = /^[a-zA-Z\s\-']+$/
  if (!re.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' }
  }
  
  return { isValid: true }
}

/**
 * Image file validation
 */
export const validateImage = (file: File): Promise<{
  isValid: boolean
  error?: string
}> => {
  return new Promise((resolve) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      resolve({ 
        isValid: false, 
        error: 'Please upload a valid image file (JPEG, PNG, GIF, WEBP)' 
      })
      return
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      resolve({ 
        isValid: false, 
        error: 'Image must be less than 10MB' 
      })
      return
    }

    // Check dimensions
    const img = new Image()
    img.src = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      
      const minDimension = 200
      if (img.width < minDimension || img.height < minDimension) {
        resolve({ 
          isValid: false, 
          error: `Image must be at least ${minDimension}x${minDimension} pixels` 
        })
        return
      }
      
      resolve({ isValid: true })
    }
    
    img.onerror = () => {
      resolve({ isValid: false, error: 'Failed to load image' })
    }
  })
}

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string): {
  isValid: boolean
  error?: string
} => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: `${fieldName} is required` }
  }
  return { isValid: true }
}

/**
 * Numeric validation
 */
export const validateNumber = (value: string | number, options?: {
  min?: number
  max?: number
  integer?: boolean
}): {
  isValid: boolean
  error?: string
} => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Must be a valid number' }
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Must be a whole number' }
  }
  
  if (options?.min !== undefined && num < options.min) {
    return { isValid: false, error: `Must be at least ${options.min}` }
  }
  
  if (options?.max !== undefined && num > options.max) {
    return { isValid: false, error: `Must be at most ${options.max}` }
  }
  
  return { isValid: true }
}