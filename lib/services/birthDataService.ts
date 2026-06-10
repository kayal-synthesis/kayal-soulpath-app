import { createClient } from '@/lib/supabase/client'

export interface BirthData {
  // Raw input
  name: string
  dob: string
  birthTime?: string
  birthLocation?: string
  
  // Calculated - NUMEROLOGY
  lifePathNumber: number
  destinyNumber: number
  soulUrgeNumber: number
  personalityNumber: number
  birthdayNumber: number
  
  // Calculated - ASTROLOGY
  sunSign: string
  moonSign: string
  risingSign: string
  dominantElement: 'fire' | 'earth' | 'air' | 'water'
  currentTransits: any // Planetary positions
  
  // Calculated - PHILOSOPHY
  lifePurpose: string
  karmicLesson: string
  soulAge: 'young' | 'maturing' | 'old' | 'ancient'
  
  // Calculated - SPIRIT SCIENCE
  energyType: 'seer' | 'healer' | 'teacher' | 'creator'
  spiritualGifts: string[]
  auraColor: string
  chakraBalance: Record<string, number>
}

export class BirthDataService {
  private synthesisEngineUrl = process.env.NEXT_PUBLIC_SYNTHESIS_ENGINE_URL
  
  // Calculate ALL aspects using your synthesis engine
  async calculateCompleteProfile(birthData: Partial<BirthData>): Promise<BirthData> {
    try {
      const response = await fetch(`${this.synthesisEngineUrl}/api/v1/calculate-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: birthData.name,
          dob: birthData.dob,
          birthTime: birthData.birthTime,
          birthLocation: birthData.birthLocation
        })
      })
      
      if (!response.ok) throw new Error('Synthesis engine error')
      
      const profile = await response.json()
      return profile
      
    } catch (error) {
      console.error('Error calculating profile:', error)
      // Fallback to basic numerology if engine unavailable
      return this.calculateBasicProfile(birthData)
    }
  }
  
  // Fallback: Basic numerology (already in your code)
  calculateBasicProfile(birthData: Partial<BirthData>): BirthData {
    const lifePathNumber = this.calculateLifePath(birthData.dob || '')
    
    return {
      name: birthData.name || '',
      dob: birthData.dob || '',
      birthTime: birthData.birthTime,
      birthLocation: birthData.birthLocation,
      lifePathNumber,
      destinyNumber: this.calculateDestiny(birthData.name || ''),
      soulUrgeNumber: this.calculateSoulUrge(birthData.name || ''),
      personalityNumber: this.calculatePersonality(birthData.name || ''),
      birthdayNumber: this.calculateBirthday(birthData.dob || ''),
      sunSign: this.calculateSunSign(birthData.dob || ''),
      moonSign: 'Calculating...',
      risingSign: birthData.birthTime ? 'Calculating...' : 'Need birth time',
      dominantElement: this.getElementFromLifePath(lifePathNumber),
      currentTransits: {},
      lifePurpose: this.getLifePurpose(lifePathNumber),
      karmicLesson: this.getKarmicLesson(lifePathNumber),
      soulAge: this.getSoulAge(lifePathNumber),
      energyType: this.getEnergyType(lifePathNumber),
      spiritualGifts: this.getSpiritualGifts(lifePathNumber),
      auraColor: this.getAuraColor(lifePathNumber),
      chakraBalance: this.getChakraBalance(lifePathNumber)
    }
  }
  
  // Numerology calculators
  calculateLifePath(dob: string): number {
    const digits = dob.replace(/-/g, '').split('').map(Number)
    const sum = digits.reduce((a, b) => a + b, 0)
    return sum % 9 || 9
  }
  
  calculateDestiny(name: string): number {
    // A=1, B=2, etc.
    const letters = name.toUpperCase().replace(/[^A-Z]/g, '').split('')
    const sum = letters.reduce((acc, letter) => {
      return acc + (letter.charCodeAt(0) - 64)
    }, 0)
    return this.reduceToSingleDigit(sum)
  }
  
  calculateSoulUrge(name: string): number {
    const vowels = name.toUpperCase().match(/[AEIOU]/g) || []
    const sum = vowels.reduce((acc, vowel) => acc + (vowel.charCodeAt(0) - 64), 0)
    return this.reduceToSingleDigit(sum)
  }
  
  calculatePersonality(name: string): number {
    const consonants = name.toUpperCase().match(/[^AEIOU]/g) || []
    const sum = consonants.reduce((acc, cons) => acc + (cons.charCodeAt(0) - 64), 0)
    return this.reduceToSingleDigit(sum)
  }
  
  calculateBirthday(dob: string): number {
    const day = parseInt(dob.split('-')[2])
    return this.reduceToSingleDigit(day)
  }
  
  private reduceToSingleDigit(num: number): number {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0)
    }
    return num
  }
  
  // Astrology (simplified - your synthesis engine will do real calculations)
  calculateSunSign(dob: string): string {
    const date = new Date(dob)
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries'
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus'
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini'
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer'
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo'
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo'
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra'
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio'
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius'
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn'
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius'
    return 'Pisces'
  }
  
  getElementFromLifePath(lifePath: number): 'fire' | 'earth' | 'air' | 'water' {
    const elements = {
      1: 'fire', 3: 'fire', 5: 'fire',
      2: 'earth', 4: 'earth', 6: 'earth',
      7: 'air', 8: 'air', 9: 'air',
      11: 'water', 22: 'water', 33: 'water'
    }
    return elements[lifePath] || 'air'
  }
  
  getLifePurpose(lifePath: number): string {
    const purposes = {
      1: 'To pioneer new paths and inspire others through leadership',
      2: 'To create harmony and build bridges between people',
      3: 'To express joy and creativity, uplifting others',
      4: 'To build lasting foundations that serve generations',
      5: 'To embrace freedom and teach others liberation',
      6: 'To nurture and heal, creating beauty and harmony',
      7: 'To seek wisdom and share profound truths',
      8: 'To manifest abundance and empower others',
      9: 'To serve humanity with compassion and wisdom',
      11: 'To illuminate spiritual truths as a visionary',
      22: 'To build master works that transform society',
      33: 'To embody divine love and healing'
    }
    return purposes[lifePath] || 'To fulfill your unique destiny'
  }
  
  getKarmicLesson(lifePath: number): string {
    const lessons = {
      1: 'Learning to lead without dominating',
      2: 'Balancing cooperation with self-care',
      3: 'Expressing without seeking external validation',
      4: 'Building structure without becoming rigid',
      5: 'Embracing freedom while maintaining discipline',
      6: 'Nurturing others without losing yourself',
      7: 'Trusting inner wisdom over external authority',
      8: 'Using power ethically and generously',
      9: 'Releasing attachments while serving fully',
      11: 'Grounding spiritual insights in practical action',
      22: 'Balancing grand vision with practical details',
      33: 'Channeling divine love without burnout'
    }
    return lessons[lifePath] || 'Learning your soul\'s unique lesson'
  }
  
  getSoulAge(lifePath: number): 'young' | 'maturing' | 'old' | 'ancient' {
    if (lifePath <= 3) return 'young'
    if (lifePath <= 6) return 'maturing'
    if (lifePath <= 9) return 'old'
    return 'ancient'
  }
  
  getEnergyType(lifePath: number): 'seer' | 'healer' | 'teacher' | 'creator' {
    const types = {
      1: 'creator', 2: 'healer', 3: 'creator',
      4: 'teacher', 5: 'seer', 6: 'healer',
      7: 'seer', 8: 'teacher', 9: 'healer',
      11: 'seer', 22: 'teacher', 33: 'healer'
    }
    return types[lifePath] || 'creator'
  }
  
  getSpiritualGifts(lifePath: number): string[] {
    const gifts = {
      1: ['Leadership', 'Courage', 'Initiative'],
      2: ['Intuition', 'Diplomacy', 'Empathy'],
      3: ['Creativity', 'Expression', 'Joy'],
      4: ['Manifestation', 'Discipline', 'Practicality'],
      5: ['Freedom', 'Adaptability', 'Wisdom'],
      6: ['Healing', 'Nurturing', 'Beauty'],
      7: ['Insight', 'Analysis', 'Spiritual wisdom'],
      8: ['Abundance', 'Power', 'Organization'],
      9: ['Compassion', 'Wisdom', 'Service'],
      11: ['Vision', 'Inspiration', 'Spiritual insight'],
      22: ['Mastery', 'Manifestation', 'Practical vision'],
      33: ['Divine love', 'Healing', 'Compassion']
    }
    return gifts[lifePath] || ['Unique spiritual gifts']
  }
  
  getAuraColor(lifePath: number): string {
    const colors = {
      1: 'Red', 2: 'Orange', 3: 'Yellow',
      4: 'Green', 5: 'Blue', 6: 'Indigo',
      7: 'Violet', 8: 'Pink', 9: 'Gold',
      11: 'White', 22: 'Crystal', 33: 'Rainbow'
    }
    return colors[lifePath] || 'Violet'
  }
  
  getChakraBalance(lifePath: number): Record<string, number> {
    const balances = {
      1: { root: 9, sacral: 7, solar: 5, heart: 5, throat: 5, third: 5, crown: 5 },
      2: { root: 5, sacral: 9, solar: 5, heart: 7, throat: 5, third: 5, crown: 5 },
      3: { root: 5, sacral: 5, solar: 9, heart: 5, throat: 7, third: 5, crown: 5 },
      4: { root: 7, sacral: 5, solar: 9, heart: 5, throat: 5, third: 5, crown: 5 },
      5: { root: 5, sacral: 7, solar: 5, heart: 5, throat: 9, third: 5, crown: 5 },
      6: { root: 5, sacral: 5, solar: 5, heart: 9, throat: 5, third: 7, crown: 5 },
      7: { root: 5, sacral: 5, solar: 5, heart: 5, throat: 5, third: 9, crown: 7 },
      8: { root: 7, sacral: 5, solar: 9, heart: 5, throat: 5, third: 5, crown: 5 },
      9: { root: 5, sacral: 5, solar: 5, heart: 7, throat: 5, third: 5, crown: 9 }
    }
    return balances[lifePath] || {
      root: 5, sacral: 5, solar: 5, heart: 5, throat: 5, third: 5, crown: 5
    }
  }
}

export const birthDataService = new BirthDataService()