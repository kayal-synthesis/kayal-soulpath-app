'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  X, 
  Loader2, 
  History, 
  TrendingUp, 
  Filter,
  ChevronRight,
  Clock,
  Star,
  Zap,
  Sparkles,
  Command,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card } from './Card'

export interface SearchSuggestion {
  id: string
  text: string
  type?: 'recent' | 'trending' | 'suggestion' | 'category' | 'tool'
  icon?: React.ReactNode
  category?: string
  description?: string
  action?: () => void
}

export interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'tool' | 'domain' | 'report' | 'insight' | 'help'
  url?: string
  icon?: React.ReactNode
  badge?: string
  score?: number
  metadata?: Record<string, any>
}

export interface SearchBarProps {
  /**
   * Placeholder text
   */
  placeholder?: string
  
  /**
   * Value (controlled)
   */
  value?: string
  
  /**
   * Default value (uncontrolled)
   */
  defaultValue?: string
  
  /**
   * On change callback
   */
  onChange?: (value: string) => void
  
  /**
   * On search callback
   */
  onSearch?: (value: string) => void
  
  /**
   * On clear callback
   */
  onClear?: () => void
  
  /**
   * Suggestions to show
   */
  suggestions?: SearchSuggestion[]
  
  /**
   * Search results
   */
  results?: SearchResult[]
  
  /**
   * Whether search is loading
   */
  isLoading?: boolean
  
  /**
   * Whether to show suggestions
   */
  showSuggestions?: boolean
  
  /**
   * Whether to show recent searches
   */
  showRecent?: boolean
  
  /**
   * Recent searches
   */
  recentSearches?: string[]
  
  /**
   * On recent search click
   */
  onRecentClick?: (search: string) => void
  
  /**
   * On clear recent
   */
  onClearRecent?: () => void
  
  /**
   * Max recent searches to show
   */
  maxRecent?: number
  
  /**
   * Whether to show trending
   */
  showTrending?: boolean
  
  /**
   * Trending searches
   */
  trendingSearches?: Array<{ text: string; count: number }>
  
  /**
   * On trending click
   */
  onTrendingClick?: (term: string) => void
  
  /**
   * Whether to show filters
   */
  showFilters?: boolean
  
  /**
   * Filter options
   */
  filterOptions?: Array<{ id: string; label: string; count?: number }>
  
  /**
   * Active filters
   */
  activeFilters?: string[]
  
  /**
   * On filter change
   */
  onFilterChange?: (filters: string[]) => void
  
  /**
   * Whether to show categories
   */
  showCategories?: boolean
  
  /**
   * Category options
   */
  categoryOptions?: Array<{ id: string; label: string; icon?: React.ReactNode }>
  
  /**
   * Active category
   */
  activeCategory?: string
  
  /**
   * On category change
   */
  onCategoryChange?: (category: string) => void
  
  /**
   * Whether to show search history
   */
  showSearchHistory?: boolean
  
  /**
   * Search history
   */
  searchHistory?: Array<{ query: string; timestamp: Date }>
  
  /**
   * On history click
   */
  onHistoryClick?: (query: string) => void
  
  /**
   * Whether to show keyboard shortcuts
   */
  showShortcuts?: boolean
  
  /**
   * Keyboard shortcut
   */
  shortcut?: string
  
  /**
   * On shortcut trigger
   */
  onShortcut?: () => void
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Whether to autofocus
   */
  autoFocus?: boolean
  
  /**
   * Whether to clear on escape
   */
  clearOnEscape?: boolean
  
  /**
   * Debounce delay (ms)
   */
  debounceDelay?: number
  
  /**
   * Minimum characters to search
   */
  minChars?: number
  
  /**
   * Max results to show
   */
  maxResults?: number
  
  /**
   * Whether to show no results message
   */
  showNoResults?: boolean
  
  /**
   * No results message
   */
  noResultsMessage?: string
  
  /**
   * Custom no results component
   */
  noResultsComponent?: React.ReactNode
  
  /**
   * On result click
   */
  onResultClick?: (result: SearchResult) => void
  
  /**
   * On suggestion click
   */
  onSuggestionClick?: (suggestion: SearchSuggestion) => void
  
  /**
   * Whether to highlight matches
   */
  highlightMatches?: boolean
  
  /**
   * Highlight color
   */
  highlightColor?: string
  
  /**
   * Additional className
   */
  className?: string
  
  /**
   * Input className
   */
  inputClassName?: string
  
  /**
   * Dropdown className
   */
  dropdownClassName?: string
  
  /**
   * Whether to close on select
   */
  closeOnSelect?: boolean
  
  /**
   * Whether to show clear button
   */
  showClearButton?: boolean
  
  /**
   * Whether to show search button
   */
  showSearchButton?: boolean
  
  /**
   * Search button text
   */
  searchButtonText?: string
  
  /**
   * Placement of dropdown
   */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  
  /**
   * Z-index of dropdown
   */
  zIndex?: number
  
  /**
   * Test ID
   */
  testId?: string
}

const sizeClasses = {
  sm: {
    input: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    clear: 'w-4 h-4',
    dropdown: 'mt-1',
    result: 'p-2 text-sm'
  },
  md: {
    input: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    clear: 'w-5 h-5',
    dropdown: 'mt-2',
    result: 'p-3 text-base'
  },
  lg: {
    input: 'px-5 py-3 text-lg',
    icon: 'w-6 h-6',
    clear: 'w-6 h-6',
    dropdown: 'mt-3',
    result: 'p-4 text-lg'
  }
}

const placementClasses = {
  'bottom-start': 'top-full left-0',
  'bottom-end': 'top-full right-0',
  'top-start': 'bottom-full left-0',
  'top-end': 'bottom-full right-0'
}

export const SearchBar = ({
  placeholder = 'Search...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  onClear,
  suggestions = [],
  results = [],
  isLoading = false,
  showSuggestions = true,
  showRecent = true,
  recentSearches = [],
  onRecentClick,
  onClearRecent,
  maxRecent = 5,
  showTrending = true,
  trendingSearches = [],
  onTrendingClick,
  showFilters = false,
  filterOptions = [],
  activeFilters = [],
  onFilterChange,
  showCategories = false,
  categoryOptions = [],
  activeCategory,
  onCategoryChange,
  showSearchHistory = false,
  searchHistory = [],
  onHistoryClick,
  showShortcuts = true,
  shortcut = '/',
  onShortcut,
  size = 'md',
  autoFocus = false,
  clearOnEscape = true,
  debounceDelay = 300,
  minChars = 2,
  maxResults = 10,
  showNoResults = true,
  noResultsMessage = 'No results found',
  noResultsComponent,
  onResultClick,
  onSuggestionClick,
  highlightMatches = true,
  highlightColor = 'bg-primary-100 text-primary-900',
  className,
  inputClassName,
  dropdownClassName,
  closeOnSelect = true,
  showClearButton = true,
  showSearchButton = false,
  searchButtonText = 'Search',
  placement = 'bottom-start',
  zIndex = 50,
  testId
}: SearchBarProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const value = controlledValue ?? internalValue
  const debouncedValue = useDebounce(value, debounceDelay)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === shortcut && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        onShortcut?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut, onShortcut])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setFiltersOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = (showSuggestions ? suggestions.length : 0) + (results?.length || 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (selectedIndex < suggestions.length) {
            handleSuggestionClick(suggestions[selectedIndex])
          } else {
            const resultIndex = selectedIndex - suggestions.length
            if (results[resultIndex]) {
              handleResultClick(results[resultIndex])
            }
          }
        } else {
          handleSearch(value)
        }
        break
      case 'Escape':
        if (clearOnEscape) {
          handleClear()
        }
        setIsOpen(false)
        setFiltersOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        setFiltersOpen(false)
        break
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
    setIsOpen(newValue.length >= minChars)
    setSelectedIndex(-1)
  }

  const handleSearch = (searchValue: string) => {
    onSearch?.(searchValue)
    setIsOpen(false)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    onClear?.()
    inputRef.current?.focus()
    setIsOpen(false)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setInternalValue(suggestion.text)
    onChange?.(suggestion.text)
    onSuggestionClick?.(suggestion)
    if (closeOnSelect) setIsOpen(false)
  }

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result)
    if (result.url) {
      window.location.href = result.url
    }
    if (closeOnSelect) setIsOpen(false)
  }

  const handleFilterToggle = (filterId: string) => {
    const newFilters = activeFilters.includes(filterId)
      ? activeFilters.filter(f => f !== filterId)
      : [...activeFilters, filterId]
    onFilterChange?.(newFilters)
  }

  const highlightText = (text: string, query: string) => {
    if (!highlightMatches || !query) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className={highlightColor}>{part}</span>
      ) : (
        part
      )
    )
  }

  const sizes = sizeClasses[size]

  return (
    <div className={cn('relative', className)} data-testid={testId}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <Search className={cn(
          'absolute left-3 text-neutral-400',
          sizes.icon
        )} />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= minChars && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'bg-white dark:bg-neutral-800',
            'placeholder:text-neutral-400',
            sizes.input,
            showClearButton && value ? 'pr-16' : 'pr-10',
            showSearchButton && 'pr-24',
            inputClassName
          )}
        />

        {/* Clear Button */}
        {showClearButton && value && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors',
              sizes.clear
            )}
            aria-label="Clear search"
          >
            <X className={sizes.icon} />
          </button>
        )}

        {/* Search Button */}
        {showSearchButton && (
          <Button
            ref={buttonRef}
            size={size}
            onClick={() => handleSearch(value)}
            className="absolute right-1"
            disabled={!value}
          >
            {searchButtonText}
          </Button>
        )}

        {/* Shortcut Badge */}
        {showShortcuts && !value && (
          <div className="absolute right-3 flex items-center gap-1 text-xs text-neutral-400">
            <Command className="w-3 h-3" />
            <span>{shortcut}</span>
          </div>
        )}

        {/* Filter Button */}
        {showFilters && (
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              'absolute right-12 p-1 rounded-lg transition-colors',
              filtersOpen ? 'bg-primary-100 text-primary-600' : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Dropdown */}
      <AnimatePresence>
        {filtersOpen && showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            ref={dropdownRef}
            className={cn(
              'absolute z-50 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-3',
              placementClasses[placement],
              dropdownClassName
            )}
            style={{ zIndex }}
          >
            <h4 className="font-medium mb-2">Filters</h4>
            <div className="space-y-2">
              {filterOptions.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterToggle(filter.id)}
                  className="flex items-center justify-between w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  <span className="text-sm">{filter.label}</span>
                  <div className="flex items-center gap-2">
                    {filter.count !== undefined && (
                      <Badge size="sm">{filter.count}</Badge>
                    )}
                    {activeFilters.includes(filter.id) && (
                      <Check className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            ref={dropdownRef}
            className={cn(
              'absolute z-50 w-full bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden',
              sizes.dropdown,
              placementClasses[placement],
              dropdownClassName
            )}
            style={{ zIndex }}
          >
            {/* Categories */}
            {showCategories && categoryOptions.length > 0 && (
              <div className="flex gap-1 p-2 border-b border-neutral-200 dark:border-neutral-700">
                {categoryOptions.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryChange?.(cat.id)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1',
                      activeCategory === cat.id
                        ? 'bg-primary-100 text-primary-600'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              {/* Recent Searches */}
              {showRecent && recentSearches.length > 0 && (
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Recent
                    </h4>
                    {onClearRecent && (
                      <button
                        onClick={onClearRecent}
                        className="text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {recentSearches.slice(0, maxRecent).map((search, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInternalValue(search)
                          onChange?.(search)
                          onRecentClick?.(search)
                          if (closeOnSelect) setIsOpen(false)
                        }}
                        className="flex items-center gap-2 w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition text-left"
                      >
                        <History className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {showTrending && trendingSearches.length > 0 && (
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Trending
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((trend, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInternalValue(trend.text)
                          onChange?.(trend.text)
                          onTrendingClick?.(trend.text)
                          if (closeOnSelect) setIsOpen(false)
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-sm hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {trend.text}
                        {trend.count && (
                          <Badge size="sm">{trend.count}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Suggestions
                  </h4>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          'flex items-center gap-2 w-full p-2 rounded-lg transition text-left',
                          selectedIndex === i && 'bg-primary-50 dark:bg-primary-900/20',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        )}
                      >
                        {suggestion.icon || (
                          <Sparkles className="w-4 h-4 text-primary-500" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">
                            {highlightMatches && value
                              ? highlightText(suggestion.text, value)
                              : suggestion.text}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-neutral-500">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                        {suggestion.category && (
                          <Badge size="sm">{suggestion.category}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 ? (
                <div className="p-3">
                  <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                    Results
                  </h4>
                  <div className="space-y-1">
                    {results.slice(0, maxResults).map((result, i) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          'flex items-start gap-3 w-full p-3 rounded-lg transition text-left',
                          selectedIndex === suggestions.length + i && 'bg-primary-50 dark:bg-primary-900/20',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        )}
                      >
                        {result.icon || (
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            result.type === 'tool' && 'bg-primary-100 text-primary-600',
                            result.type === 'domain' && 'bg-secondary-100 text-secondary-600',
                            result.type === 'report' && 'bg-green-100 text-green-600',
                            result.type === 'insight' && 'bg-purple-100 text-purple-600',
                            result.type === 'help' && 'bg-blue-100 text-blue-600'
                          )}>
                            {result.type === 'tool' && <Zap className="w-4 h-4" />}
                            {result.type === 'domain' && <Sparkles className="w-4 h-4" />}
                            {result.type === 'report' && <Star className="w-4 h-4" />}
                            {result.type === 'insight' && <Sparkles className="w-4 h-4" />}
                            {result.type === 'help' && <Sparkles className="w-4 h-4" />}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {highlightMatches && value
                                ? highlightText(result.title, value)
                                : result.title}
                            </span>
                            {result.badge && (
                              <Badge size="sm">{result.badge}</Badge>
                            )}
                          </div>
                          {result.description && (
                            <div className="text-sm text-neutral-500 mt-1">
                              {highlightMatches && value
                                ? highlightText(result.description, value)
                                : result.description}
                            </div>
                          )}
                          {result.metadata && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                              {result.metadata.date && (
                                <span>{new Date(result.metadata.date).toLocaleDateString()}</span>
                              )}
                              {result.metadata.views && (
                                <span>{result.metadata.views} views</span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : value.length >= minChars && showNoResults && !isLoading && (
                <div className="p-8 text-center">
                  {noResultsComponent || (
                    <>
                      <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                      <p className="text-neutral-500">{noResultsMessage}</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        Try different keywords or filters
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-600" />
                  <p className="text-sm text-neutral-500 mt-2">Searching...</p>
                </div>
              )}
            </div>

            {/* Search History */}
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  History
                </h4>
                <div className="space-y-1">
                  {searchHistory.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInternalValue(item.query)
                        onChange?.(item.query)
                        onHistoryClick?.(item.query)
                        if (closeOnSelect) setIsOpen(false)
                      }}
                      className="flex items-center gap-2 w-full p-2 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition text-left"
                    >
                      <Clock className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm flex-1">{item.query}</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}