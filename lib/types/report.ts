export interface Report {
  id: string
  title: string
  subtitle?: string
  description: string
  type: 'numerology' | 'palmistry' | 'physiognomy' | 'compatibility'
  domain: 'love' | 'career' | 'wealth' | 'spiritual' | 'health' | 'life-path'
  price?: number
  isFree: boolean
  isOwned: boolean
  thumbnail?: string
  features: string[]
  createdAt: string
  updatedAt: string
  popularity: number
  rating: number
  reviewCount: number
}

export interface ReportDetail extends Report {
  content: ReportContent
  metadata: ReportMetadata
  shareUrl: string
  downloadUrl?: string
}

export interface ReportContent {
  introduction: string
  sections: ReportSection[]
  conclusion: string
  disclaimer?: string
}

export interface ReportSection {
  id: string
  title: string
  content: string
  icon?: string
  likes: number
  userLiked?: boolean
  shareable: boolean
  imageUrl?: string
  tips?: string[]
}

export interface ReportMetadata {
  wordCount: number
  readingTime: number
  generatedFor: {
    userId: string
    name: string
    date: string
    data: {
      name: string
      dob: string
      birthTime?: string
      birthLocation?: string
      handImage?: boolean
      faceImage?: boolean
    }
  }
  version: string
  modelVersion?: string
  confidence?: number
}

export interface DailyGuidance {
  day: number
  theme: string
  guidance: string
  peakHours: string
  energy: 'high' | 'medium' | 'low'
  color: string
  shareable: boolean
  affirmation: string
  luckyNumbers: number[]
  luckyColors: string[]
}

export interface CompatibilityResult {
  id: string
  score: number
  match: string
  categories: CompatibilityCategory[]
  insights: CompatibilityInsight[]
  shareUrl: string
  createdAt: string
}

export interface CompatibilityCategory {
  name: string
  score: number
  description: string
  icon?: string
  strengths?: string[]
  challenges?: string[]
}

export interface CompatibilityInsight {
  title: string
  content: string
  type: 'strength' | 'challenge' | 'opportunity' | 'advice'
}

export interface ReportFilters {
  type?: Report['type'][]
  domain?: Report['domain'][]
  price?: 'free' | 'paid' | 'owned'
  sortBy?: 'popularity' | 'newest' | 'price-low' | 'price-high'
  search?: string
  limit?: number
  offset?: number
}