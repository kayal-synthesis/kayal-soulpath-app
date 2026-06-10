'use client'

import { motion } from 'framer-motion'
import { 
  Inbox, 
  Search, 
  Filter, 
  AlertCircle, 
  Package, 
  Users, 
  Heart, 
  MessageCircle,
  Calendar,
  FileText,
  Image,
  Mail,
  Bell,
  Star,
  Clock,
  Settings,
  Wifi,
  WifiOff,
  Zap,
  Coffee,
  Smile,
  Frown,
  Meh,
  Loader2,
  Plus,
  RefreshCw,
  ArrowRight,
  Home,
  Compass
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from './Button'

export interface EmptyStateProps {
  /**
   * Icon to display (can be a Lucide icon component or custom element)
   */
  icon?: React.ReactNode
  
  /**
   * Icon name for predefined icons
   */
  iconName?: 'inbox' | 'search' | 'filter' | 'error' | 'package' | 'users' | 'heart' | 
                'message' | 'calendar' | 'document' | 'image' | 'mail' | 'bell' | 'star' |
                'clock' | 'settings' | 'wifi' | 'wifi-off' | 'zap' | 'coffee' | 'smile' |
                'frown' | 'meh'
  
  /**
   * Main title text
   */
  title: string
  
  /**
   * Description text
   */
  description?: string
  
  /**
   * Action button text
   */
  actionText?: string
  
  /**
   * Action button onClick handler
   */
  onAction?: () => void
  
  /**
   * Secondary action text
   */
  secondaryActionText?: string
  
  /**
   * Secondary action onClick handler
   */
  onSecondaryAction?: () => void
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Whether to show a dashed border
   */
  bordered?: boolean
  
  /**
   * Background color variant
   */
  background?: 'default' | 'muted' | 'gradient' | 'none'
  
  /**
   * Additional className
   */
  className?: string
  
  /**
   * Children for custom content
   */
  children?: React.ReactNode
  
  /**
   * Loading state
   */
  isLoading?: boolean
  
  /**
   * Error state
   */
  isError?: boolean
  
  /**
   * Error message (if isError is true)
   */
  errorMessage?: string
  
  /**
   * Retry function for error state
   */
  onRetry?: () => void
  
  /**
   * Illustration component (can be custom SVG)
   */
  illustration?: React.ReactNode
  
  /**
   * Compact mode (removes padding and reduces size)
   */
  compact?: boolean
  
  /**
   * Alignment
   */
  align?: 'left' | 'center' | 'right'
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  filter: Filter,
  error: AlertCircle,
  package: Package,
  users: Users,
  heart: Heart,
  message: MessageCircle,
  calendar: Calendar,
  document: FileText,
  image: Image,
  mail: Mail,
  bell: Bell,
  star: Star,
  clock: Clock,
  settings: Settings,
  wifi: Wifi,
  'wifi-off': WifiOff,
  zap: Zap,
  coffee: Coffee,
  smile: Smile,
  frown: Frown,
  meh: Meh
}

const sizeClasses = {
  sm: {
    container: 'p-4',
    icon: 'w-8 h-8',
    iconContainer: 'w-12 h-12',
    title: 'text-base',
    description: 'text-sm',
    gap: 'gap-2'
  },
  md: {
    container: 'p-8',
    icon: 'w-12 h-12',
    iconContainer: 'w-20 h-20',
    title: 'text-xl',
    description: 'text-sm',
    gap: 'gap-4'
  },
  lg: {
    container: 'p-12',
    icon: 'w-16 h-16',
    iconContainer: 'w-24 h-24',
    title: 'text-2xl',
    description: 'text-base',
    gap: 'gap-6'
  }
}

const backgroundClasses = {
  default: 'bg-white',
  muted: 'bg-neutral-50',
  gradient: 'bg-gradient-to-br from-primary-50 to-secondary-50',
  none: ''
}

const alignClasses = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end'
}

// Pre-defined empty state templates
export const EmptyInbox = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="inbox"
    title="No messages yet"
    description="When you receive messages, they'll appear here"
    {...props}
  />
)

export const EmptySearch = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="search"
    title="No results found"
    description="Try adjusting your search or filters"
    actionText="Clear filters"
    {...props}
  />
)

export const EmptyNotifications = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="bell"
    title="All caught up!"
    description="You have no new notifications"
    {...props}
  />
)

export const EmptyFavorites = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="heart"
    title="No favorites yet"
    description="Star items to add them to your favorites"
    actionText="Explore tools"
    {...props}
  />
)

export const EmptyCart = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="package"
    title="Your cart is empty"
    description="Looks like you haven't added anything yet"
    actionText="Start shopping"
    {...props}
  />
)

export const EmptyTasks = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="clock"
    title="No tasks for today"
    description="Enjoy your free time or create a new task"
    actionText="Create task"
    {...props}
  />
)

export const EmptyData = (props: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="document"
    title="No data available"
    description="There's nothing to display here yet"
    actionText="Refresh"
    secondaryActionText="Learn more"
    {...props}
  />
)

export const ErrorState = ({ message = "Something went wrong", onRetry, ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    iconName="error"
    title="Error"
    description={message}
    isError
    onRetry={onRetry}
    {...props}
  />
)

export const LoadingState = ({ message = "Loading...", ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={<Loader2 className="w-12 h-12 animate-spin text-primary-600" />}
    title={message}
    description="Please wait"
    isLoading
    {...props}
  />
)

export const EmptyState = ({
  icon,
  iconName,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  size = 'md',
  bordered = false,
  background = 'default',
  className,
  children,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  illustration,
  compact = false,
  align = 'center'
}: EmptyStateProps) => {
  const IconComponent = iconName ? iconMap[iconName] : null
  const sizes = sizeClasses[size]
  const backgroundClass = backgroundClasses[background]
  const alignClass = alignClasses[align]

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex flex-col',
          alignClass,
          sizes.gap,
          !compact && sizes.container,
          bordered && 'border-2 border-dashed border-neutral-200 rounded-xl',
          backgroundClass,
          className
        )}
      >
        <div className={cn('relative', sizes.iconContainer)}>
          <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-20" />
          <div className="absolute inset-0 bg-primary-100 rounded-full animate-pulse" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Loader2 className={cn('animate-spin text-primary-600', sizes.icon)} />
          </div>
        </div>
        <h3 className={cn('font-serif', sizes.title)}>{title}</h3>
        {description && (
          <p className={cn('text-neutral-500 max-w-sm', sizes.description)}>
            {description}
          </p>
        )}
      </motion.div>
    )
  }

  // Error state
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col',
          alignClass,
          sizes.gap,
          !compact && sizes.container,
          bordered && 'border-2 border-dashed border-red-200 rounded-xl',
          'bg-red-50',
          className
        )}
      >
        <div className={cn('relative', sizes.iconContainer)}>
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <AlertCircle className={cn('text-red-500', sizes.icon)} />
          </div>
        </div>
        <h3 className={cn('font-serif text-red-700', sizes.title)}>{title}</h3>
        <p className={cn('text-red-600 max-w-sm', sizes.description)}>
          {errorMessage || description}
        </p>
        {(onRetry || onAction) && (
          <div className="flex gap-3 mt-2">
            {onRetry && (
              <Button variant="primary" size={size} onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onAction && (
              <Button variant="outline" size={size} onClick={onAction}>
                Go Back
              </Button>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'flex flex-col',
        alignClass,
        sizes.gap,
        !compact && sizes.container,
        bordered && 'border-2 border-dashed border-neutral-200 rounded-xl',
        backgroundClass,
        className
      )}
    >
      {/* Icon or Illustration */}
      {(icon || IconComponent || illustration) && (
        <div className={cn('relative', sizes.iconContainer)}>
          {illustration ? (
            <div className="w-full h-full">
              {illustration}
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-primary-100 rounded-full opacity-20 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {icon ? (
                  icon
                ) : IconComponent && (
                  <IconComponent className={cn('text-primary-600', sizes.icon)} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Text Content */}
      <div className="space-y-2">
        <h3 className={cn('font-serif text-primary-900', sizes.title)}>
          {title}
        </h3>
        {description && (
          <p className={cn('text-neutral-600 max-w-sm mx-auto', sizes.description)}>
            {description}
          </p>
        )}
      </div>

      {/* Custom Children */}
      {children}

      {/* Actions */}
      {(actionText || secondaryActionText) && (
        <div className="flex gap-3 mt-2">
          {actionText && onAction && (
            <Button
              variant="primary"
              size={size}
              onClick={onAction}
              className="group"
            >
              {actionText}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button
              variant="outline"
              size={size}
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Empty state with illustration
export const IllustratedEmptyState = ({ 
  title, 
  description, 
  actionText, 
  onAction,
  illustration
}: any) => (
  <EmptyState
    illustration={illustration}
    title={title}
    description={description}
    actionText={actionText}
    onAction={onAction}
    size="lg"
    background="gradient"
    bordered
    className="overflow-hidden relative"
  />
)

// Empty state for chat
export const EmptyChat = ({ onStartChat }: { onStartChat?: () => void }) => (
  <EmptyState
    iconName="message"
    title="No messages yet"
    description="Start a conversation with the AI assistant"
    actionText="Start Chat"
    onAction={onStartChat}
    size="lg"
    background="gradient"
    className="min-h-[400px]"
  />
)

// Empty state for dashboard
export const EmptyDashboard = ({ onExplore }: { onExplore?: () => void }) => (
  <EmptyState
    iconName="compass"
    title="Welcome to your dashboard"
    description="Get started by exploring our tools and insights"
    actionText="Explore Tools"
    onAction={onExplore}
    size="lg"
    background="gradient"
    bordered
  />
)

// Empty state with search suggestions
export const EmptySearchWithSuggestions = ({
  query,
  suggestions,
  onSuggestionClick
}: {
  query: string
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
}) => (
  <EmptyState
    iconName="search"
    title={`No results for "${query}"`}
    description="Try these suggestions instead:"
    size="md"
    background="muted"
    bordered
  >
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick(suggestion)}
          className="px-4 py-2 bg-white border border-neutral-200 rounded-full text-sm hover:border-primary-300 hover:text-primary-600 transition"
        >
          {suggestion}
        </button>
      ))}
    </div>
  </EmptyState>
)

// Network error state
export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    iconName="wifi-off"
    title="Network Error"
    description="Unable to connect. Please check your internet connection"
    actionText="Retry"
    onAction={onRetry}
    size="lg"
    background="muted"
    bordered
    isError
  />
)

// Coming soon state
export const ComingSoon = ({ feature }: { feature: string }) => (
  <EmptyState
    iconName="clock"
    title={`${feature} Coming Soon`}
    description="We're working hard to bring you this feature"
    actionText="Notify Me"
    size="lg"
    background="gradient"
    bordered
  />
)

// No access state
export const NoAccess = ({ onUpgrade }: { onUpgrade?: () => void }) => (
  <EmptyState
    iconName="lock"
    title="Premium Feature"
    description="Upgrade to access this feature and unlock 70+ tools"
    actionText="Upgrade Now"
    onAction={onUpgrade}
    size="lg"
    background="gradient"
    bordered
  />
)

// Empty state for referrals
export const EmptyReferrals = ({ onShare }: { onShare?: () => void }) => (
  <EmptyState
    iconName="users"
    title="No referrals yet"
    description="Share your link and earn rewards when friends join"
    actionText="Share Link"
    onAction={onShare}
    size="lg"
    background="gradient"
    bordered
  />
)

// Empty timeline
export const EmptyTimeline = ({ onRefresh }: { onRefresh?: () => void }) => (
  <EmptyState
    iconName="clock"
    title="No activity yet"
    description="Your timeline will update as you use Kayal LifeOS"
    actionText="Refresh"
    onAction={onRefresh}
    size="md"
    background="muted"
  />
)

// Add missing icon to iconMap
iconMap.compass = Compass
iconMap.lock = AlertCircle // Using AlertCircle as fallback for lock