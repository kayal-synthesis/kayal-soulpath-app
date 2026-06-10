'use client'

import { Card } from '@/components/ui/Card'
import { Sun, MapPin, Droplets, Wind } from 'lucide-react'

export const WeatherWidget = () => {
  const weather = {
    location: 'San Francisco',
    temperature: 72,
    condition: 'sunny',
    humidity: 65,
    windSpeed: 8
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-secondary-400" />
            {weather.location}
          </h3>
          <p className="text-2xl font-light mt-1">{weather.temperature}°F</p>
        </div>
        <Sun className="w-8 h-8 text-secondary-400" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Droplets className="w-3 h-3 text-secondary-400" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="w-3 h-3 text-secondary-400" />
          <span>{weather.windSpeed} mph</span>
        </div>
      </div>
    </Card>
  )
}