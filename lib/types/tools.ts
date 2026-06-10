export interface Tool {
  id: string
  name: string
  emoji: string
  description?: string
  shortDescription?: string
  price: number
  category: string
  domain?: string
  isPopular?: boolean
  isNew?: boolean
  isBestSeller?: boolean
  features?: string[]
  requiresImage?: any
  estimatedReadTime?: number
}

export interface Domain {
  id: string
  name: string
  icon: string
  color: string
  url: string
  tools: Tool[]
}