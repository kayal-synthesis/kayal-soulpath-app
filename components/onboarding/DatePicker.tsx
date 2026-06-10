'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  className?: string
}

export const DatePicker = ({ value, onChange, className = '' }: DatePickerProps) => {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  
  const currentYear = new Date().getFullYear()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
  
  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) return 31
    const monthIndex = months.indexOf(month) + 1
    return new Date(parseInt(year), monthIndex, 0).getDate()
  }

  useEffect(() => {
    if (selectedMonth && selectedDay && selectedYear) {
      const monthIndex = months.indexOf(selectedMonth) + 1
      const formattedDate = `${selectedYear}-${String(monthIndex).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      onChange(formattedDate)
    }
  }, [selectedMonth, selectedDay, selectedYear, onChange])

  // Parse initial value if provided
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-')
      if (year && month && day) {
        setSelectedYear(year)
        setSelectedMonth(months[parseInt(month) - 1])
        setSelectedDay(parseInt(day).toString())
      }
    }
  }, [value])

  const days = Array.from(
    { length: getDaysInMonth(selectedMonth, selectedYear) }, 
    (_, i) => i + 1
  )

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {/* Month Select */}
      <div className="relative">
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value)
            setSelectedDay('')
          }}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          <option value="">Month</option>
          {months.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      </div>

      {/* Day Select */}
      <div className="relative">
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          disabled={!selectedMonth}
        >
          <option value="">Day</option>
          {days.map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      </div>

      {/* Year Select */}
      <div className="relative">
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value)
            setSelectedDay('')
          }}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          <option value="">Year</option>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      </div>
    </div>
  )
}